import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getEnv, isProduction } from '../config/env.js';
import ImageAsset from '../models/ImageAsset.js';

// ============================================================
// JWT Authentication Middleware
// ============================================================

/**
 * Extract and verify JWT token from Authorization header.
 * Sets req.user with user data from DB if valid.
 * Returns null (no error) if no token — for optional auth.
 */
export async function getAuthUser(req) {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
      return null;
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, jwtSecret);

    // Verify user still exists and is active
    const userRow = await User.findOne({
      where: { publicId: decoded.id, isActive: true },
      attributes: [
        'id',
        'publicId',
        'name',
        'email',
        'role',
        'class',
        'phone',
        'avatar',
        'avatarImageId',
        'isActive',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!userRow) return null;

    const u = userRow.get({ plain: true });
    const authUser = {
      _dbId: u.id,
      _id: u.publicId,
      id: u.publicId,
      name: u.name,
      email: u.email,
      role: u.role,
      class: u.class,
      phone: u.phone,
      avatar: u.avatar,
      avatarImageId: null,
      isActive: u.isActive,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
    };

    if (u.avatarImageId) {
      const img = await ImageAsset.findByPk(u.avatarImageId, {
        attributes: ['publicId', 'imageType', 'imageBase64'],
      });
      if (img) {
        const p = img.get({ plain: true });
        authUser.avatarImageId = p.publicId;
        authUser.avatar = `data:${p.imageType};base64,${p.imageBase64}`;
      }
    }

    return authUser;
  } catch (err) {
    return null;
  }
}

/**
 * Middleware: Require authentication.
 * Returns 401 if not authenticated.
 */
export function requireAuth() {
  return async (req, res, next) => {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please login first.',
        data: null,
      });
    }
    req.user = user;
    next();
  };
}

/**
 * Middleware: Require specific role(s).
 * Must be used AFTER requireAuth().
 * @param {string|string[]} roles - Required role(s)
 */
export function requireRole(roles) {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return async (req, res, next) => {
    // First check authentication
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please login first.',
        data: null,
      });
    }
    req.user = user;

    // Then check role
    if (!roleArray.includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden. Insufficient permissions.',
        data: null,
      });
    }
    next();
  };
}

/**
 * Generate JWT token for a user.
 * @param {Object} user - User object with id and role
 * @returns {string} JWT token
 */
export function generateToken(user) {
  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    const err = new Error('Missing JWT secret. Set JWT_SECRET in the environment.');
    err.code = 'MISSING_JWT_SECRET';
    throw err;
  }

  return jwt.sign(
    { id: user._id || user.id, role: user.role },
    jwtSecret,
    { expiresIn: '24h' }
  );
}

function getJwtSecret() {
  const secret = getEnv('JWT_SECRET', ['JWT_SECRET_KEY', 'JWT_KEY']);
  if (secret) return secret;
  if (isProduction()) {
    return null;
  }
  return null;
}
