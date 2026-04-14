import CounselingSession from '../models/CounselingSession.js';
import ChatMessage from '../models/ChatMessage.js';
import User from '../models/User.js';
import ImageAsset from '../models/ImageAsset.js';
import { buildDataUrl } from '../utils/image.js';
import { Op } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

// ============================================================
// Session Controller — Converted from api/sessions/index.php
// ============================================================

/**
 * GET /api/sessions
 * Get all counseling sessions
 */
export async function getAll(req, res) {
  try {
    const user = req.user;
    const userDbId = user?._dbId;
    if (!userDbId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.', data: null });
    }

    const where = {};
    if (user.role === 'student') {
      where.studentId = userDbId;
    } else if (user.role === 'teacher') {
      where[Op.or] = [{ teacherId: userDbId }, { openToAll: true, teacherId: null }];
    }

    const sessions = await CounselingSession.findAll({
      where,
      include: [
        { model: User, as: 'student', attributes: ['id', 'publicId', 'name', 'class', 'avatar', 'avatarImageId'] },
        { model: User, as: 'teacher', attributes: ['id', 'publicId', 'name', 'avatar', 'avatarImageId'] },
      ],
      order: [['updatedAt', 'DESC']],
    });

    const avatarIds = sessions
      .flatMap((s) => [s.student?.avatarImageId, s.teacher?.avatarImageId])
      .filter(Boolean)
      .map((id) => Number(id));
    const avatars = avatarIds.length
      ? await ImageAsset.findAll({
          where: { id: { [Op.in]: avatarIds } },
          attributes: ['id', 'imageType', 'imageBase64'],
        })
      : [];
    const avatarMap = new Map(avatars.map((img) => [img.id, img.get({ plain: true })]));

    // Enrich with unread count and last message (like PHP subqueries)
    const result = await Promise.all(
      sessions.map(async (s) => {
        const unreadCount = await ChatMessage.count({
          where: {
            sessionId: s.id,
            isRead: false,
            senderId: { [Op.ne]: userDbId },
          },
        });

        const lastMessage = await ChatMessage.findOne({
          where: { sessionId: s.id },
          order: [['createdAt', 'DESC']],
          attributes: ['message', 'createdAt'],
        });

        return {
          id: s.publicId,
          _id: s.publicId,
          student_id: s.student?.publicId || null,
          teacher_id: s.teacher?.publicId || null,
          title: s.title,
          description: s.description,
          status: s.status,
          open_to_all: s.openToAll,
          video_link: s.videoLink,
          session_date: s.sessionDate,
          created_at: s.createdAt,
          updated_at: s.updatedAt,
          student_name: s.student?.name || null,
          student_class: s.student?.class || null,
          student_avatar: (() => {
            const img = s.student?.avatarImageId
              ? avatarMap.get(s.student.avatarImageId)
              : null;
            return img ? buildDataUrl(img.imageType, img.imageBase64) : s.student?.avatar || null;
          })(),
          teacher_name: s.teacher?.name || null,
          teacher_avatar: (() => {
            const img = s.teacher?.avatarImageId
              ? avatarMap.get(s.teacher.avatarImageId)
              : null;
            return img ? buildDataUrl(img.imageType, img.imageBase64) : s.teacher?.avatar || null;
          })(),
          unread_count: unreadCount,
          last_message: lastMessage?.message || null,
          last_message_at: lastMessage?.createdAt || null,
        };
      })
    );

    return res.json({ success: true, message: 'Sessions fetched.', data: result });
  } catch (err) {
    console.error('getSessions error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * GET /api/sessions/:id
 * Get single session
 */
export async function getOne(req, res) {
  try {
    const user = req.user;
    const userPublicId = user?._id || user?.id;
    const userDbId = user?._dbId;
    const { id } = req.params;

    if (!userDbId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.', data: null });
    }

    const session = await CounselingSession.findOne({
      where: { publicId: id },
      include: [
        { model: User, as: 'student', attributes: ['id', 'publicId', 'name', 'class', 'email', 'avatar', 'avatarImageId'] },
        { model: User, as: 'teacher', attributes: ['id', 'publicId', 'name', 'email', 'avatar', 'avatarImageId'] },
      ],
    });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.', data: null });
    }

    if (user.role === 'student' && String(session.student?.publicId || '') !== String(userPublicId)) {
      return res.status(403).json({ success: false, message: 'Forbidden.', data: null });
    }
    if (user.role === 'teacher') {
      const assigned = session.teacher?.publicId || null;
      if (assigned && String(assigned) !== String(userPublicId)) {
        return res.status(403).json({ success: false, message: 'Forbidden.', data: null });
      }
      if (!assigned && !session.openToAll) {
        return res.status(403).json({ success: false, message: 'Forbidden.', data: null });
      }
    }

    let studentAvatar = session.student?.avatar || null;
    let teacherAvatar = session.teacher?.avatar || null;
    if (session.student?.avatarImageId) {
      const img = await ImageAsset.findByPk(session.student.avatarImageId, { attributes: ['imageType', 'imageBase64'] });
      if (img) {
        const p = img.get({ plain: true });
        studentAvatar = buildDataUrl(p.imageType, p.imageBase64);
      }
    }
    if (session.teacher?.avatarImageId) {
      const img = await ImageAsset.findByPk(session.teacher.avatarImageId, { attributes: ['imageType', 'imageBase64'] });
      if (img) {
        const p = img.get({ plain: true });
        teacherAvatar = buildDataUrl(p.imageType, p.imageBase64);
      }
    }

    const result = {
      id: session.publicId,
      _id: session.publicId,
      student_id: session.student?.publicId || null,
      teacher_id: session.teacher?.publicId || null,
      title: session.title,
      description: session.description,
      status: session.status,
      open_to_all: session.openToAll,
      video_link: session.videoLink,
      session_date: session.sessionDate,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
      student_name: session.student?.name || null,
      student_class: session.student?.class || null,
      student_email: session.student?.email || null,
      student_avatar: studentAvatar,
      teacher_name: session.teacher?.name || null,
      teacher_email: session.teacher?.email || null,
      teacher_avatar: teacherAvatar,
    };

    return res.json({ success: true, message: 'Session fetched.', data: result });
  } catch (err) {
    console.error('getSession error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * POST /api/sessions
 * Create counseling session (student only)
 */
export async function create(req, res) {
  try {
    const user = req.user;
    const userDbId = user?._dbId;
    const userPublicId = user?._id || user?.id;
    const { title, description, teacher_id, open_to_all } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: 'Judul masalah wajib diisi.', data: null });
    }

    if (!userDbId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.', data: null });
    }

    let teacherId = null;
    let openToAll = Boolean(open_to_all);

    if (teacher_id) {
      const teacher = await User.findOne({ where: { publicId: teacher_id, role: 'teacher', isActive: true }, attributes: ['id', 'publicId'] });
      if (!teacher) {
        return res.status(400).json({ success: false, message: 'Guru BK tidak ditemukan.', data: null });
      }
      teacherId = teacher.id;
      openToAll = false;
    } else if (!openToAll) {
      // Find a teacher to assign (first active teacher)
      const teacher = await User.findOne({ where: { role: 'teacher', isActive: true }, attributes: ['id'] });
      teacherId = teacher?.id || null;
    }

    const session = await CounselingSession.create({
      studentId: userDbId,
      teacherId,
      openToAll,
      title: title.trim(),
      description: description?.trim() || null,
      status: 'pending',
    });

    const populated = await CounselingSession.findByPk(session.id, {
      include: [
        { model: User, as: 'student', attributes: ['publicId', 'name'] },
        { model: User, as: 'teacher', attributes: ['publicId', 'name'] },
      ],
    });

    const result = {
      id: populated.publicId,
      _id: populated.publicId,
      student_id: populated.student?.publicId || userPublicId,
      teacher_id: populated.teacher?.publicId || null,
      title: populated.title,
      description: populated.description,
      status: populated.status,
      open_to_all: populated.openToAll,
      created_at: populated.createdAt,
      updated_at: populated.updatedAt,
      student_name: populated.student?.name || null,
      teacher_name: populated.teacher?.name || null,
    };

    return res.status(201).json({ success: true, message: 'Sesi konseling berhasil dibuat.', data: result });
  } catch (err) {
    console.error('createSession error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * PUT /api/sessions/:id
 * Update session
 */
export async function update(req, res) {
  try {
    const user = req.user;
    const { id } = req.params;
    const body = req.body;

    const session = await CounselingSession.findOne({ where: { publicId: id } });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.', data: null });
    }

    const updates = {};
    if (body.status && ['pending', 'active', 'completed', 'cancelled'].includes(body.status)) {
      updates.status = body.status;
    }
    if (body.video_link !== undefined) {
      updates.videoLink = body.video_link;
    }
    if (body.teacher_id !== undefined && ['teacher', 'admin'].includes(user.role)) {
      if (body.teacher_id) {
        const teacher = await User.findOne({ where: { publicId: body.teacher_id, role: 'teacher', isActive: true }, attributes: ['id'] });
        if (!teacher) {
          return res.status(400).json({ success: false, message: 'Guru BK tidak ditemukan.', data: null });
        }
        updates.teacherId = teacher.id;
      } else {
        updates.teacherId = null;
      }
      updates.openToAll = false;
    }
    if (body.session_date !== undefined) {
      updates.sessionDate = body.session_date;
    }
    if (body.title !== undefined) {
      updates.title = body.title.trim();
    }
    if (body.description !== undefined) {
      updates.description = body.description.trim();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.', data: null });
    }

    await CounselingSession.update(updates, { where: { id: session.id } });

    const populated = await CounselingSession.findByPk(session.id, {
      include: [
        { model: User, as: 'student', attributes: ['publicId', 'name'] },
        { model: User, as: 'teacher', attributes: ['publicId', 'name'] },
      ],
    });

    const result = {
      id: populated.publicId,
      _id: populated.publicId,
      student_id: populated.student?.publicId || null,
      teacher_id: populated.teacher?.publicId || null,
      title: populated.title,
      description: populated.description,
      status: populated.status,
      video_link: populated.videoLink,
      session_date: populated.sessionDate,
      created_at: populated.createdAt,
      updated_at: populated.updatedAt,
      student_name: populated.student?.name || null,
      teacher_name: populated.teacher?.name || null,
    };

    return res.json({ success: true, message: 'Session updated.', data: result });
  } catch (err) {
    console.error('updateSession error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * DELETE /api/sessions/:id
 * Delete session (teacher/admin only)
 */
export async function deleteSession(req, res) {
  try {
    const { id } = req.params;
    const session = await CounselingSession.findOne({ where: { publicId: id }, attributes: ['id'] });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found.', data: null });
    }

    await sequelize.transaction(async (t) => {
      await ChatMessage.destroy({ where: { sessionId: session.id }, transaction: t });
      await CounselingSession.destroy({ where: { id: session.id }, transaction: t });
    });

    return res.json({ success: true, message: 'Session deleted.', data: null });
  } catch (err) {
    console.error('deleteSession error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}
