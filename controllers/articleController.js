import Article from '../models/Article.js';
import { getAuthUser } from '../middleware/auth.js';
import ImageAsset from '../models/ImageAsset.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import { sequelize } from '../db/sequelize.js';
import { toMongoDoc } from '../utils/mongoCompat.js';

// ============================================================
// Article Controller — Converted from api/articles/index.php
// ============================================================

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now();
}

function stripHtml(raw = '') {
  return String(raw)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * GET /api/articles
 * Get all articles (with filters)
 */
export async function getAll(req, res) {
  try {
    const { category, search, published } = req.query;
    const user = await getAuthUser(req);

    const where = {};

    // Only show published articles to non-admin
    if (!user || user.role === 'student') {
      where.isPublished = true;
    } else if (published !== undefined) {
      where.isPublished = published === '1' || published === 'true';
    }

    if (category) {
      where.category = category;
    }
    if (search) {
      const like = `%${String(search)}%`;
      where[Op.or] = [{ title: { [Op.like]: like } }, { content: { [Op.like]: like } }];
    }

    const articles = await Article.findAll({
      where,
      include: [{ model: User, as: 'author', attributes: ['publicId', 'name'] }],
      order: [['createdAt', 'DESC']],
    });

    // Map to match PHP response format
    const thumbDbIds = articles.map((a) => a.thumbnailImageId).filter(Boolean);
    const images = thumbDbIds.length
      ? await ImageAsset.findAll({
          where: { id: { [Op.in]: thumbDbIds } },
          attributes: ['id', 'publicId', 'imageBase64', 'imageType'],
        })
      : [];
    const imageMap = new Map(images.map((img) => [img.id, img.get({ plain: true })]));

    const result = articles.map((a) => {
      const img = a.thumbnailImageId ? imageMap.get(a.thumbnailImageId) : null;
      const thumbnailBase64 = img ? img.imageBase64 : null;
      const thumbnailType = img ? img.imageType : null;
      const thumbnail = img ? `data:${thumbnailType};base64,${thumbnailBase64}` : a.thumbnail;
      return {
        id: a.publicId,
        _id: a.publicId,
        title: a.title,
        slug: a.slug,
        category: a.category,
        thumbnail,
        thumbnail_base64: thumbnailBase64,
        thumbnail_type: thumbnailType,
        thumbnail_image_id: img?.publicId || null,
        is_published: a.isPublished ? 1 : 0,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
        author_name: a.author?.name || null,
      };
    });

    return res.json({
      success: true,
      message: 'Articles fetched.',
      data: result,
    });
  } catch (err) {
    console.error('getArticles error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * GET /api/articles/:id
 * Get single article by id or slug
 */
export async function getOne(req, res) {
  try {
    const { id } = req.params;

    // Try to find by publicId or slug
    const isPublicId = /^[0-9a-fA-F]{24}$/.test(id);
    const articleRow = isPublicId
      ? await Article.findOne({
          where: { publicId: id },
          include: [{ model: User, as: 'author', attributes: ['publicId', 'name'] }],
        })
      : await Article.findOne({
          where: { slug: id },
          include: [{ model: User, as: 'author', attributes: ['publicId', 'name'] }],
        });

    if (!articleRow) {
      return res.status(404).json({ success: false, message: 'Article not found.', data: null });
    }

    let thumbnail = articleRow.thumbnail;
    let thumbnailBase64 = null;
    let thumbnailType = null;
    let thumbnailImagePublicId = null;
    if (articleRow.thumbnailImageId) {
      const img = await ImageAsset.findByPk(articleRow.thumbnailImageId, {
        attributes: ['publicId', 'imageBase64', 'imageType'],
      });
      if (img) {
        const p = img.get({ plain: true });
        thumbnailBase64 = p.imageBase64;
        thumbnailType = p.imageType;
        thumbnail = `data:${thumbnailType};base64,${thumbnailBase64}`;
        thumbnailImagePublicId = p.publicId;
      }
    }

    const article = toMongoDoc(articleRow);
    delete article.author;
    // Mimic Mongoose populate shape: authorId is an object
    article.authorId = articleRow.author
      ? { _id: articleRow.author.publicId, name: articleRow.author.name }
      : null;
    // Store image public id on the field (stable external identifier).
    article.thumbnailImageId = thumbnailImagePublicId;

    const result = {
      ...article,
      id: article._id,
      author_name: article.authorId?.name || null,
      is_published: articleRow.isPublished ? 1 : 0,
      created_at: articleRow.createdAt,
      updated_at: articleRow.updatedAt,
      thumbnail,
      thumbnail_base64: thumbnailBase64,
      thumbnail_type: thumbnailType,
      thumbnail_image_id: thumbnailImagePublicId,
    };

    return res.json({ success: true, message: 'Article fetched.', data: result });
  } catch (err) {
    console.error('getArticle error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * POST /api/articles
 * Create article (admin/teacher only)
 */
export async function create(req, res) {
  try {
    const { title, content, category, thumbnail, thumbnail_image_id, thumbnailImageId, is_published } = req.body;

    const cleanTitle = title?.trim();
    const cleanContent = stripHtml(content || '');
    if (!cleanTitle || !cleanContent) {
      return res.status(400).json({ success: false, message: 'Judul dan konten wajib diisi.', data: null });
    }

    const slug = slugify(title);
    const imageId = thumbnail_image_id || thumbnailImageId || null;
    const authorDbId = req.user?._dbId;
    if (!authorDbId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login first.', data: null });
    }

    const imageRow = imageId
      ? await ImageAsset.findOne({ where: { publicId: imageId }, attributes: ['id', 'publicId', 'imageBase64', 'imageType'] })
      : null;

    const articleRow = await Article.create({
      title: cleanTitle,
      slug,
      content,
      category: category?.trim() || 'Kesehatan Mental',
      thumbnailImageId: imageRow?.id || null,
      thumbnail: imageRow ? null : (thumbnail?.trim() || null),
      authorId: authorDbId,
      isPublished: is_published !== undefined ? Boolean(Number(is_published)) : true,
    });

    const populatedRow = await Article.findByPk(articleRow.id, {
      include: [{ model: User, as: 'author', attributes: ['publicId', 'name'] }],
    });

    let createdThumb = populatedRow.thumbnail;
    let createdThumbBase64 = null;
    let createdThumbType = null;
    let createdThumbPublicId = null;
    if (populatedRow.thumbnailImageId) {
      const img = await ImageAsset.findByPk(populatedRow.thumbnailImageId, {
        attributes: ['publicId', 'imageBase64', 'imageType'],
      });
      if (img) {
        const p = img.get({ plain: true });
        createdThumbPublicId = p.publicId;
        createdThumbBase64 = p.imageBase64;
        createdThumbType = p.imageType;
        createdThumb = `data:${createdThumbType};base64,${createdThumbBase64}`;
      }
    }

    const populated = toMongoDoc(populatedRow);
    delete populated.author;
    populated.authorId = populatedRow.author ? { _id: populatedRow.author.publicId, name: populatedRow.author.name } : null;
    populated.thumbnailImageId = createdThumbPublicId;

    const result = {
      ...populated,
      id: populated._id,
      author_name: populated.authorId?.name || null,
      is_published: populatedRow.isPublished ? 1 : 0,
      created_at: populatedRow.createdAt,
      updated_at: populatedRow.updatedAt,
      thumbnail: createdThumb,
      thumbnail_base64: createdThumbBase64,
      thumbnail_type: createdThumbType,
      thumbnail_image_id: createdThumbPublicId,
    };

    return res.status(201).json({ success: true, message: 'Article created.', data: result });
  } catch (err) {
    console.error('createArticle error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * PUT /api/articles/:id
 * Update article (admin/teacher only)
 */
export async function update(req, res) {
  try {
    const { id } = req.params;
    const articleRow = await Article.findOne({ where: { publicId: id } });
    if (!articleRow) {
      return res.status(404).json({ success: false, message: 'Article not found.', data: null });
    }
    const oldThumbnailImageId = articleRow.thumbnailImageId;

    const { title, content, category, thumbnail, thumbnail_image_id, thumbnailImageId, is_published } = req.body;
    const updates = {};

    if (title !== undefined) {
      const cleanTitle = title.trim();
      if (!cleanTitle) {
        return res.status(400).json({ success: false, message: 'Judul tidak boleh kosong.', data: null });
      }
      updates.title = cleanTitle;
    }
    if (content !== undefined) {
      const cleanContent = stripHtml(content || '');
      if (!cleanContent) {
        return res.status(400).json({ success: false, message: 'Konten tidak boleh kosong.', data: null });
      }
      updates.content = content;
    }
    if (category !== undefined) {
      updates.category = category.trim() || 'Kesehatan Mental';
    }
    const hasImageIdField = thumbnail_image_id !== undefined || thumbnailImageId !== undefined;
    const imageId = thumbnail_image_id || thumbnailImageId || null;
    let nextThumbDbId = null;
    let nextThumbPublicId = null;
    if (imageId) {
      const imgRow = await ImageAsset.findOne({ where: { publicId: imageId }, attributes: ['id', 'publicId'] });
      if (!imgRow) {
        return res.status(400).json({ success: false, message: 'Thumbnail image not found.', data: null });
      }
      nextThumbDbId = imgRow.id;
      nextThumbPublicId = imgRow.publicId;
      updates.thumbnailImageId = nextThumbDbId;
      updates.thumbnail = null;
    } else if (hasImageIdField) {
      updates.thumbnailImageId = null;
    }
    if (!imageId && thumbnail !== undefined) {
      updates.thumbnail = thumbnail?.trim() || null;
    }
    if (is_published !== undefined) updates.isPublished = Boolean(Number(is_published));

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.', data: null });
    }

    await sequelize.transaction(async (t) => {
      await Article.update(updates, { where: { id: articleRow.id }, transaction: t });
      if (oldThumbnailImageId && ((nextThumbDbId && oldThumbnailImageId !== nextThumbDbId) || (hasImageIdField && !nextThumbDbId))) {
        await ImageAsset.destroy({ where: { id: oldThumbnailImageId }, transaction: t }).catch((err) => {
          console.error('delete old thumbnail error:', err);
        });
      }
    });

    const populatedRow = await Article.findByPk(articleRow.id, {
      include: [{ model: User, as: 'author', attributes: ['publicId', 'name'] }],
    });

    let updatedThumb = populatedRow.thumbnail;
    let updatedThumbBase64 = null;
    let updatedThumbType = null;
    let updatedThumbPublicId = null;
    if (populatedRow.thumbnailImageId) {
      const img = await ImageAsset.findByPk(populatedRow.thumbnailImageId, {
        attributes: ['publicId', 'imageBase64', 'imageType'],
      });
      if (img) {
        const p = img.get({ plain: true });
        updatedThumbPublicId = p.publicId;
        updatedThumbBase64 = p.imageBase64;
        updatedThumbType = p.imageType;
        updatedThumb = `data:${updatedThumbType};base64,${updatedThumbBase64}`;
      }
    }

    const populated = toMongoDoc(populatedRow);
    delete populated.author;
    populated.authorId = populatedRow.author ? { _id: populatedRow.author.publicId, name: populatedRow.author.name } : null;
    populated.thumbnailImageId = updatedThumbPublicId;

    const result = {
      ...populated,
      id: populated._id,
      author_name: populated.authorId?.name || null,
      is_published: populatedRow.isPublished ? 1 : 0,
      created_at: populatedRow.createdAt,
      updated_at: populatedRow.updatedAt,
      thumbnail: updatedThumb,
      thumbnail_base64: updatedThumbBase64,
      thumbnail_type: updatedThumbType,
      thumbnail_image_id: updatedThumbPublicId,
    };

    return res.json({ success: true, message: 'Article updated.', data: result });
  } catch (err) {
    console.error('updateArticle error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

/**
 * DELETE /api/articles/:id
 * Delete article (admin only)
 */
export async function deleteArticle(req, res) {
  try {
    const { id } = req.params;
    const articleRow = await Article.findOne({ where: { publicId: id } });
    if (!articleRow) {
      return res.status(404).json({ success: false, message: 'Article not found.', data: null });
    }

    await sequelize.transaction(async (t) => {
      await Article.destroy({ where: { id: articleRow.id }, transaction: t });
      if (articleRow.thumbnailImageId) {
        await ImageAsset.destroy({ where: { id: articleRow.thumbnailImageId }, transaction: t }).catch((err) => {
          console.error('delete thumbnail on article delete error:', err);
        });
      }
    });
    return res.json({ success: true, message: 'Article deleted.', data: null });
  } catch (err) {
    console.error('deleteArticle error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}
