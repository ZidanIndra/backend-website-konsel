import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getEnv } from '../config/env.js';
import connectDB from '../config/database.js';
import CounselingSession from '../models/CounselingSession.js';
import ChatMessage from '../models/ChatMessage.js';
import ImageAsset from '../models/ImageAsset.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import { buildDataUrl } from '../utils/image.js';

function normalizeOrigin(origin) {
  return String(origin || '').replace(/\/+$/, '');
}

function getAllowedOrigins() {
  const envOriginValues = [
    process.env.FRONTEND_URL,
    process.env.APP_URL,
    process.env.ALLOWED_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return [
    'http://localhost:5173',
    'http://localhost:3000',
    ...envOriginValues,
  ]
    .filter(Boolean)
    .map(normalizeOrigin);
}

function socketCorsOriginCheck(origin, callback) {
  if (!origin) return callback(null, true);

  const allowed = getAllowedOrigins();
  const normalizedOrigin = normalizeOrigin(origin);

  const isProduction = process.env.NODE_ENV === 'production';
  const hasExplicitAllowList = allowed.length > 2;

  if (!isProduction) return callback(null, true);
  if (!hasExplicitAllowList) return callback(null, true);

  if (allowed.includes(normalizedOrigin)) return callback(null, true);
  return callback(new Error(`CORS blocked for origin: ${origin}`));
}

function getJwtSecret() {
  return getEnv('JWT_SECRET', ['JWT_SECRET_KEY', 'JWT_KEY']);
}

async function getSocketUser(socket) {
  const authToken = socket.handshake?.auth?.token;
  const headerAuth = socket.handshake?.headers?.authorization || '';
  const bearerToken =
    typeof headerAuth === 'string' && headerAuth.startsWith('Bearer ')
      ? headerAuth.substring(7)
      : null;
  const token = authToken || bearerToken;
  if (!token) return null;

  const secret = getJwtSecret();
  if (!secret) return null;

  let decoded;
  try {
    decoded = jwt.verify(token, secret);
  } catch {
    return null;
  }

  const userRow = await User.findOne({
    where: { publicId: decoded.id, isActive: true },
    attributes: ['id', 'publicId', 'name', 'email', 'role', 'class', 'phone', 'avatar', 'avatarImageId', 'isActive'],
  });
  if (!userRow) return null;

  const u = userRow.get({ plain: true });

  let avatar = u.avatar || null;
  let avatarImagePublicId = null;
  if (u.avatarImageId) {
    const img = await ImageAsset.findByPk(u.avatarImageId, { attributes: ['publicId', 'imageType', 'imageBase64'] });
    if (img) {
      const p = img.get({ plain: true });
      avatarImagePublicId = p.publicId;
      avatar = buildDataUrl(p.imageType, p.imageBase64);
    }
  }

  return {
    _dbId: u.id,
    _id: u.publicId,
    id: u.publicId,
    name: u.name,
    email: u.email,
    role: u.role,
    class: u.class,
    phone: u.phone,
    avatar,
    avatarImageId: avatarImagePublicId,
    isActive: u.isActive,
  };
}

async function resolveSessionForUser(sessionPublicId, user) {
  if (!sessionPublicId) return null;

  const sessionWhere = { publicId: sessionPublicId };
  if (user.role === 'student') {
    sessionWhere.studentId = user._dbId;
  } else if (user.role === 'teacher') {
    sessionWhere[Op.or] = [{ teacherId: user._dbId }, { openToAll: true, teacherId: null }];
  }

  return CounselingSession.findOne({ where: sessionWhere, attributes: ['id', 'publicId'] });
}

function roomName(sessionDbId) {
  return `session:${sessionDbId}`;
}

export function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: socketCorsOriginCheck,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    try {
      await connectDB();
      const user = await getSocketUser(socket);
      if (!user) return next(new Error('unauthorized'));
      socket.data.user = user;
      next();
    } catch (err) {
      next(err);
    }
  });

  io.on('connection', (socket) => {
    socket.emit('chat:ready', { success: true });

    socket.on('chat:join', async (payload = {}, ack) => {
      try {
        const user = socket.data.user;
        const sessionId = payload.session_id || payload.sessionId || null;
        const session = await resolveSessionForUser(sessionId, user);
        if (!session) {
          const msg = { success: false, message: 'Session not found or access denied.', data: null };
          if (typeof ack === 'function') ack(msg);
          return;
        }

        socket.join(roomName(session.id));
        const ok = { success: true, message: 'Joined.', data: { session_id: session.publicId } };
        if (typeof ack === 'function') ack(ok);
      } catch (err) {
        console.error('socket chat:join error:', err);
        if (typeof ack === 'function') ack({ success: false, message: 'Internal server error.', data: null });
      }
    });

    socket.on('chat:history', async (payload = {}, ack) => {
      try {
        const user = socket.data.user;
        const sessionId = payload.session_id || payload.sessionId || null;
        const limit = Math.max(1, Math.min(200, Number(payload.limit ?? 100)));

        const session = await resolveSessionForUser(sessionId, user);
        if (!session) {
          const msg = { success: false, message: 'Session not found or access denied.', data: [] };
          if (typeof ack === 'function') ack(msg);
          return;
        }

        const messages = await ChatMessage.findAll({
          where: { sessionId: session.id },
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'publicId', 'name', 'role', 'avatar', 'avatarImageId'],
            },
          ],
          order: [['createdAt', 'ASC']],
          limit,
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

        const data = messages.map((m) => ({
          sender_avatar: (() => {
            const img = m.sender?.avatarImageId ? avatarMap.get(m.sender.avatarImageId) : null;
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
            { where: { sessionId: session.id, senderId: { [Op.ne]: user._dbId }, isRead: false } }
          );
        }

        if (typeof ack === 'function') ack({ success: true, message: 'History fetched.', data });
      } catch (err) {
        console.error('socket chat:history error:', err);
        if (typeof ack === 'function') ack({ success: false, message: 'Internal server error.', data: [] });
      }
    });

    socket.on('chat:send', async (payload = {}, ack) => {
      try {
        const user = socket.data.user;
        const sessionId = payload.session_id || payload.sessionId || null;
        const messageRaw = payload.message ?? '';
        const message = String(messageRaw || '').trim();

        if (!sessionId || !message) {
          const msg = { success: false, message: 'session_id and message are required.', data: null };
          if (typeof ack === 'function') ack(msg);
          return;
        }
        if (message.length > 2000) {
          const msg = { success: false, message: 'Message too long (max 2000 characters).', data: null };
          if (typeof ack === 'function') ack(msg);
          return;
        }

        const session = await resolveSessionForUser(sessionId, user);
        if (!session) {
          const msg = { success: false, message: 'Session not found or access denied.', data: null };
          if (typeof ack === 'function') ack(msg);
          return;
        }

        const row = await ChatMessage.create({
          sessionId: session.id,
          senderId: user._dbId,
          message,
        });

        // If session is still pending, activate it once a message is sent
        await CounselingSession.update(
          { status: 'active' },
          { where: { id: session.id, status: 'pending' } }
        );

        const populated = await ChatMessage.findByPk(row.id, {
          include: [
            {
              model: User,
              as: 'sender',
              attributes: ['id', 'publicId', 'name', 'role', 'avatar', 'avatarImageId'],
            },
          ],
        });

        let senderAvatar = populated.sender?.avatar || null;
        if (populated.sender?.avatarImageId) {
          const img = await ImageAsset.findByPk(populated.sender.avatarImageId, { attributes: ['imageType', 'imageBase64'] });
          if (img) {
            const p = img.get({ plain: true });
            senderAvatar = buildDataUrl(p.imageType, p.imageBase64);
          }
        }

        const data = {
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

        io.to(roomName(session.id)).emit('chat:message', data);
        if (typeof ack === 'function') ack({ success: true, message: 'Message sent.', data });
      } catch (err) {
        console.error('socket chat:send error:', err);
        if (typeof ack === 'function') ack({ success: false, message: 'Internal server error.', data: null });
      }
    });
  });

  return io;
}
