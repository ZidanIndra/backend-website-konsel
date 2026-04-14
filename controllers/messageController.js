import ChatMessage from '../models/ChatMessage.js';
import CounselingSession from '../models/CounselingSession.js';
import ImageAsset from '../models/ImageAsset.js';
import { buildDataUrl } from '../utils/image.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

// ============================================================
// Message Controller — Converted from api/messages/index.php
// ============================================================

/**
 * GET /api/messages?session_id=X&last_id=Y
 * Get messages for a session (polling-based)
 */
export async function getMessages(req, res) {
  try {
    const user = req.user;
    const { session_id, last_id } = req.query;

    if (!session_id) {
      return res.status(400).json({ success: false, message: 'session_id is required', data: null });
    }

    // Verify access to this session
    const userDbId = user?._dbId;
    if (!userDbId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.', data: null });
    }

    const sessionWhere = { publicId: session_id };
    if (user.role === 'student') {
      sessionWhere.studentId = userDbId;
    } else if (user.role === 'teacher') {
      sessionWhere[Op.or] = [{ teacherId: userDbId }, { openToAll: true, teacherId: null }];
    }

    const session = await CounselingSession.findOne({ where: sessionWhere, attributes: ['id', 'publicId'] });
    if (!session) {
      return res.status(403).json({ success: false, message: 'Session not found or access denied.', data: null });
    }

    // Build message query
    const msgWhere = { sessionId: session.id };
    if (last_id && last_id !== '0') {
      // Get messages created after the last_id message's timestamp
      const lastMsg = await ChatMessage.findOne({ where: { publicId: last_id }, attributes: ['createdAt'] });
      if (lastMsg?.createdAt) {
        msgWhere.createdAt = { [Op.gt]: lastMsg.createdAt };
      }
    }

    const messages = await ChatMessage.findAll({
      where: msgWhere,
      include: [
        {
          model: User,
          as: 'sender',
          attributes: ['id', 'publicId', 'name', 'role', 'avatar', 'avatarImageId'],
        },
      ],
      order: [['createdAt', 'ASC']],
      limit: 100,
    });

    const avatarIds = messages
      .map((m) => m.sender?.avatarImageId)
      .filter(Boolean)
      .map((id) => Number(id));
    const avatars = avatarIds.length
      ? await ImageAsset.findAll({
          where: { id: { [Op.in]: avatarIds } },
          attributes: ['id', 'imageType', 'imageBase64'],
        })
      : [];
    const avatarMap = new Map(avatars.map((img) => [img.id, img.get({ plain: true })]));

    // Map to match PHP response format
    const result = messages.map((m) => ({
      sender_avatar: (() => {
        const img = m.sender?.avatarImageId
          ? avatarMap.get(m.sender.avatarImageId)
          : null;
        return img ? buildDataUrl(img.imageType, img.imageBase64) : m.sender?.avatar || null;
      })(),
      id: m.publicId,
      _id: m.publicId,
      session_id: session.publicId,
      sender_id: m.sender?.publicId || null,
      message: m.message,
      is_read: m.isRead ? 1 : 0,
      created_at: m.createdAt,
      sender_name: m.sender?.name || null,
      sender_role: m.sender?.role || null,
    }));

    // Mark messages as read (messages sent by others)
    if (messages.length > 0) {
      await ChatMessage.update(
        { isRead: true },
        { where: { sessionId: session.id, senderId: { [Op.ne]: userDbId }, isRead: false } }
      );
    }

    return res.json({ success: true, message: 'Messages fetched.', data: result });
  } catch (err) {
    console.error('getMessages error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * POST /api/messages
 * Send a message in a session
 */
export async function send(req, res) {
  try {
    const user = req.user;
    const { session_id, message } = req.body;

    if (!session_id || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'session_id and message are required.', data: null });
    }

    if (message.length > 2000) {
      return res.status(400).json({ success: false, message: 'Message too long (max 2000 characters).', data: null });
    }

    // Verify access
    const userDbId = user?._dbId;
    if (!userDbId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.', data: null });
    }

    const sessionWhere = { publicId: session_id };
    if (user.role === 'student') {
      sessionWhere.studentId = userDbId;
    } else if (user.role === 'teacher') {
      sessionWhere[Op.or] = [{ teacherId: userDbId }, { openToAll: true, teacherId: null }];
    }

    const session = await CounselingSession.findOne({ where: sessionWhere });
    if (!session) {
      return res.status(403).json({ success: false, message: 'Session not found or access denied.', data: null });
    }

    const populated = await sequelize.transaction(async (t) => {
      const chatMsg = await ChatMessage.create(
        {
          sessionId: session.id,
          senderId: userDbId,
          message: message.trim(),
        },
        { transaction: t }
      );

      if (session.status === 'pending') {
        await CounselingSession.update({ status: 'active' }, { where: { id: session.id }, transaction: t });
      }

      return await ChatMessage.findByPk(chatMsg.id, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'publicId', 'name', 'role', 'avatar', 'avatarImageId'],
          },
        ],
        transaction: t,
      });
    });

    let senderAvatar = populated.sender?.avatar || null;
    if (populated.sender?.avatarImageId) {
      const img = await ImageAsset.findByPk(populated.sender.avatarImageId, {
        attributes: ['imageType', 'imageBase64'],
      });
      if (img) {
        const p = img.get({ plain: true });
        senderAvatar = buildDataUrl(p.imageType, p.imageBase64);
      }
    }

    const result = {
      id: populated.publicId,
      _id: populated.publicId,
      session_id: session.publicId,
      sender_id: populated.sender?.publicId || null,
      message: populated.message,
      is_read: populated.isRead ? 1 : 0,
      created_at: populated.createdAt,
      sender_name: populated.sender?.name || null,
      sender_role: populated.sender?.role || null,
      sender_avatar: senderAvatar,
    };

    return res.status(201).json({ success: true, message: 'Message sent.', data: result });
  } catch (err) {
    console.error('sendMessage error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * PUT /api/messages/:id/read
 * Mark a message as read
 */
export async function markRead(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const userDbId = user?._dbId;
    if (!userDbId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.', data: null });
    }

    await ChatMessage.update(
      { isRead: true },
      { where: { publicId: id, senderId: { [Op.ne]: userDbId } } }
    );

    return res.json({ success: true, message: 'Marked as read.', data: null });
  } catch (err) {
    console.error('markRead error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}
