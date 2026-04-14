import { comparePassword, hashPassword } from '../utils/password.js';
import User from '../models/User.js';
import { generateToken, getAuthUser } from '../middleware/auth.js';
import ImageAsset from '../models/ImageAsset.js';

// ============================================================
// Auth Controller — Converted from api/auth/index.php
// ============================================================

/**
 * POST /api/auth/login
 * Login with email & password
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email dan password wajib diisi.',
        data: null,
      });
    }

    const userRow = await User.findOne({
      where: { email: email.trim().toLowerCase(), isActive: true },
      attributes: [
        'id',
        'publicId',
        'name',
        'email',
        'password',
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

    if (!userRow) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah.',
        data: null,
      });
    }

    const u = userRow.get({ plain: true });
    if (!(await comparePassword(password, u.password))) {
      return res.status(401).json({
        success: false,
        message: 'Email atau password salah.',
        data: null,
      });
    }

    const user = {
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
      const img = await ImageAsset.findByPk(u.avatarImageId, { attributes: ['publicId', 'imageType', 'imageBase64'] });
      if (img) {
        const p = img.get({ plain: true });
        user.avatarImageId = p.publicId;
        user.avatar = `data:${p.imageType};base64,${p.imageBase64}`;
      }
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      message: 'Login berhasil.',
      data: {
        token,
        user: (() => {
          const safeUser = { ...user };
          delete safeUser._dbId;
          return safeUser;
        })(),
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    const message =
      err?.code === 'MISSING_JWT_SECRET'
        ? err.message
        : 'Internal server error.';
    return res.status(500).json({
      success: false,
      message,
      data: null,
    });
  }
}

/**
 * POST /api/auth/register
 * Register a new student account
 */
export async function register(req, res) {
  try {
    const { name, email, password, class: userClass, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Nama, email, dan password wajib diisi.',
        data: null,
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Format email tidak valid.',
        data: null,
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password minimal 6 karakter.',
        data: null,
      });
    }

    // Check if email already exists
    const existing = await User.findOne({ where: { email: email.trim().toLowerCase() }, attributes: ['id'] });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Email sudah terdaftar.',
        data: null,
      });
    }

    const hashed = await hashPassword(password, 10);
    const newUserRow = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role: 'student',
      class: userClass?.trim() || null,
      phone: phone?.trim() || null,
    });

    const created = newUserRow.get({ plain: true });
    const userData = {
      _id: created.publicId,
      id: created.publicId,
      name: created.name,
      email: created.email,
      role: created.role,
      class: created.class,
      phone: created.phone,
      avatar: created.avatar,
      avatarImageId: null,
      isActive: created.isActive,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };

    const token = generateToken(userData);

    return res.status(201).json({
      success: true,
      message: 'Registrasi berhasil.',
      data: { token, user: userData },
    });
  } catch (err) {
    console.error('Register error:', err);
    const message =
      err?.code === 'MISSING_JWT_SECRET'
        ? err.message
        : 'Internal server error.';
    return res.status(500).json({
      success: false,
      message,
      data: null,
    });
  }
}

/**
 * GET /api/auth/me
 * Get current authenticated user
 */
export async function me(req, res) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized. Please login first.',
        data: null,
      });
    }

    return res.json({
      success: true,
      message: 'Data user berhasil diambil.',
      data: (() => {
        const safeUser = { ...user };
        delete safeUser._dbId;
        return safeUser;
      })(),
    });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.',
      data: null,
    });
  }
}
