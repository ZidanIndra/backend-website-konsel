import { hashPassword } from '../utils/password.js';
import User from '../models/User.js';
import ImageAsset from '../models/ImageAsset.js';
import QuestionnaireResponse from '../models/QuestionnaireResponse.js';
import CounselingSession from '../models/CounselingSession.js';
import { Op } from 'sequelize';
import { sequelize } from '../db/sequelize.js';

// ============================================================
// User Controller — Converted from api/users/index.php
// ============================================================

/**
 * GET /api/users
 * Get all users (with optional role filter)
 */
export async function getAll(req, res) {
  try {
    const user = req.user;
    const userDbId = user?._dbId;
    const { role } = req.query;

    if (!userDbId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.', data: null });
    }

    const where = { id: { [Op.ne]: userDbId } };
    if (role) {
      where.role = role;
    }

    const users = await User.findAll({
      where,
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
      ],
      order: [['createdAt', 'DESC']],
    });

    const avatarIds = users
      .map((u) => u.avatarImageId)
      .filter(Boolean)
      .map((id) => Number(id));
    const avatarImages = avatarIds.length
      ? await ImageAsset.findAll({
          where: { id: { [Op.in]: avatarIds } },
          attributes: ['id', 'imageBase64', 'imageType'],
        })
      : [];
    const imageMap = new Map(avatarImages.map((img) => [img.id, img.get({ plain: true })]));

    // Enrich with counts (like PHP subqueries)
    const result = await Promise.all(
      users.map(async (u) => {
        const responseCount = await QuestionnaireResponse.count({ where: { studentId: u.id } });
        const sessionCount = await CounselingSession.count({ where: { studentId: u.id } });

        const img = u.avatarImageId ? imageMap.get(u.avatarImageId) : null;
        const avatarBase64 = img ? img.imageBase64 : null;
        const avatarType = img ? img.imageType : null;
        const avatarUrl = img ? `data:${avatarType};base64,${avatarBase64}` : u.avatar;
        return {
          id: u.publicId,
          _id: u.publicId,
          name: u.name,
          email: u.email,
          role: u.role,
          class: u.class,
          phone: u.phone,
          avatar: avatarUrl,
          avatar_base64: avatarBase64,
          avatar_type: avatarType,
          is_active: u.isActive ? 1 : 0,
          created_at: u.createdAt,
          response_count: responseCount,
          session_count: sessionCount,
        };
      })
    );

    return res.json({ success: true, message: 'Users fetched.', data: result });
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * GET /api/users/:id
 * Get single user
 */
export async function getOne(req, res) {
  try {
    const { id } = req.params;
    const userRow = await User.findOne({
      where: { publicId: id },
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
      ],
    });

    if (!userRow) {
      return res.status(404).json({ success: false, message: 'User not found.', data: null });
    }

    const user = userRow.get({ plain: true });
    let avatarUrl = user.avatar;
    let avatarBase64 = null;
    let avatarType = null;
    if (user.avatarImageId) {
      const img = await ImageAsset.findByPk(user.avatarImageId, { attributes: ['imageBase64', 'imageType'] });
      if (img) {
        const p = img.get({ plain: true });
        avatarBase64 = p.imageBase64;
        avatarType = p.imageType;
        avatarUrl = `data:${avatarType};base64,${avatarBase64}`;
      }
    }

    const result = {
      id: user.publicId,
      _id: user.publicId,
      name: user.name,
      email: user.email,
      role: user.role,
      class: user.class,
      phone: user.phone,
      avatar: avatarUrl,
      avatar_base64: avatarBase64,
      avatar_type: avatarType,
      is_active: user.isActive ? 1 : 0,
      created_at: user.createdAt,
    };

    return res.json({ success: true, message: 'User fetched.', data: result });
  } catch (err) {
    console.error('getUser error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * POST /api/users
 * Create user (admin only)
 */
export async function create(req, res) {
  try {
    const { name, email, password, role, class: userClass, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.', data: null });
    }

    if (!['student', 'teacher', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role.', data: null });
    }

    const existing = await User.findOne({ where: { email: email.trim().toLowerCase() }, attributes: ['id'] });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already exists.', data: null });
    }

    const hashed = await hashPassword(password, 10);
    const newUserRow = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role: role || 'student',
      class: userClass?.trim() || null,
      phone: phone?.trim() || null,
    });

    const newUser = newUserRow.get({ plain: true });
    let createdAvatar = newUser.avatar;
    let createdAvatarBase64 = null;
    let createdAvatarType = null;
    if (newUser.avatarImageId) {
      const img = await ImageAsset.findByPk(newUser.avatarImageId, { attributes: ['imageBase64', 'imageType'] });
      if (img) {
        const p = img.get({ plain: true });
        createdAvatarBase64 = p.imageBase64;
        createdAvatarType = p.imageType;
        createdAvatar = `data:${createdAvatarType};base64,${createdAvatarBase64}`;
      }
    }

    const result = {
      id: newUser.publicId,
      _id: newUser.publicId,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      class: newUser.class,
      phone: newUser.phone,
      avatar: createdAvatar,
      avatar_base64: createdAvatarBase64,
      avatar_type: createdAvatarType,
      is_active: newUser.isActive ? 1 : 0,
      created_at: newUser.createdAt,
    };

    return res.status(201).json({ success: true, message: 'User created.', data: result });
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * PUT /api/users/:id
 * Update user
 */
export async function update(req, res) {
  try {
    const user = req.user;
    const userPublicId = user?._id || user?.id;
    const { id } = req.params;
    const body = req.body;

    // Only admin can update other users
    if (user.role !== 'admin' && String(userPublicId) !== String(id)) {
      return res.status(403).json({ success: false, message: 'Forbidden.', data: null });
    }

    const targetUser = await User.findOne({ where: { publicId: id } });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.', data: null });
    }
    const oldAvatarImageId = targetUser.avatarImageId;

    const updates = {};
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.class !== undefined) updates.class = body.class.trim();
    if (body.phone !== undefined) updates.phone = body.phone.trim();
    if (body.password && body.password.length >= 6) {
      updates.password = await hashPassword(body.password, 10);
    }
    const hasAvatarImageField = body.avatar_image_id !== undefined || body.avatarImageId !== undefined;
    const avatarImageId = body.avatar_image_id || body.avatarImageId || null;
    if (avatarImageId) {
      const img = await ImageAsset.findOne({ where: { publicId: avatarImageId }, attributes: ['id'] });
      if (!img) {
        return res.status(400).json({ success: false, message: 'Avatar image not found.', data: null });
      }
      updates.avatarImageId = img.id;
      updates.avatar = null;
    } else if (hasAvatarImageField) {
      updates.avatarImageId = null;
    }
    if (!avatarImageId && body.avatar !== undefined) {
      updates.avatar = body.avatar || null;
    }
    if (body.is_active !== undefined && user.role === 'admin') {
      updates.isActive = Boolean(Number(body.is_active));
    }
    if (body.role !== undefined && user.role === 'admin') {
      updates.role = body.role;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.', data: null });
    }

    await sequelize.transaction(async (t) => {
      await User.update(updates, { where: { id: targetUser.id }, transaction: t });
      if (
        oldAvatarImageId &&
        ((updates.avatarImageId && oldAvatarImageId !== updates.avatarImageId) || (hasAvatarImageField && !updates.avatarImageId))
      ) {
        await ImageAsset.destroy({ where: { id: oldAvatarImageId }, transaction: t }).catch((err) => {
          console.error('delete old avatar error:', err);
        });
      }
    });

    const updated = await User.findByPk(targetUser.id, {
      attributes: ['publicId', 'name', 'email', 'role', 'class', 'phone', 'avatar', 'avatarImageId', 'isActive', 'createdAt'],
    });
    const updatedPlain = updated.get({ plain: true });

    let updatedAvatar = updatedPlain.avatar;
    let updatedAvatarBase64 = null;
    let updatedAvatarType = null;
    if (updatedPlain.avatarImageId) {
      const img = await ImageAsset.findByPk(updatedPlain.avatarImageId, { attributes: ['imageBase64', 'imageType'] });
      if (img) {
        const p = img.get({ plain: true });
        updatedAvatarBase64 = p.imageBase64;
        updatedAvatarType = p.imageType;
        updatedAvatar = `data:${updatedAvatarType};base64,${updatedAvatarBase64}`;
      }
    }

    const result = {
      id: updatedPlain.publicId,
      _id: updatedPlain.publicId,
      name: updatedPlain.name,
      email: updatedPlain.email,
      role: updatedPlain.role,
      class: updatedPlain.class,
      phone: updatedPlain.phone,
      avatar: updatedAvatar,
      avatar_base64: updatedAvatarBase64,
      avatar_type: updatedAvatarType,
      is_active: updatedPlain.isActive ? 1 : 0,
      created_at: updatedPlain.createdAt,
    };

    return res.json({ success: true, message: 'User updated.', data: result });
  } catch (err) {
    console.error('updateUser error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * DELETE /api/users/:id
 * Delete user (admin only)
 */
export async function deleteUser(req, res) {
  try {
    const user = req.user;
    const userPublicId = user?._id || user?.id;
    const { id } = req.params;

    if (String(userPublicId) === String(id)) {
      return res.status(400).json({ success: false, message: 'Cannot delete yourself.', data: null });
    }

    const targetUser = await User.findOne({ where: { publicId: id }, attributes: ['id', 'avatarImageId'] });
    if (!targetUser) {
      return res.status(404).json({ success: false, message: 'User not found.', data: null });
    }

    await sequelize.transaction(async (t) => {
      await User.destroy({ where: { id: targetUser.id }, transaction: t });
      if (targetUser.avatarImageId) {
        await ImageAsset.destroy({ where: { id: targetUser.avatarImageId }, transaction: t }).catch((err) => {
          console.error('delete avatar on user delete error:', err);
        });
      }
    });
    return res.json({ success: true, message: 'User deleted.', data: null });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}
