import Page from '../models/Page.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import { toMongoDoc, toMongoLeanDoc } from '../utils/mongoCompat.js';

function normalizePath(input = '') {
  const raw = String(input || '').trim();
  if (!raw) return '';
  return raw
    .replace(/^\/+/, '')     // no leading slash
    .replace(/\/+$/, '')     // no trailing slash
    .replace(/\/{2,}/g, '/') // collapse multiple slashes
    .toLowerCase();
}

function coerceBlocks(input) {
  let val = input;
  if (typeof val === 'string') {
    try {
      val = JSON.parse(val);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(val)) return [];
  return val;
}

export async function getAll(req, res) {
  try {
    const { section, search, published } = req.query;
    const where = {};

    if (published !== undefined) {
      where.isPublished = published === '1' || published === 'true';
    }
    if (section) {
      const s = normalizePath(section);
      if (s) {
        where[Op.or] = [{ path: s }, { path: { [Op.like]: `${s}/%` } }];
      }
    }
    if (search) {
      const like = `%${String(search)}%`;
      where[Op.or] = [{ title: { [Op.like]: like } }, { path: { [Op.like]: like } }];
    }

    const pages = await Page.findAll({
      where,
      include: [
        { model: User, as: 'createdByUser', attributes: ['publicId'] },
        { model: User, as: 'updatedByUser', attributes: ['publicId'] },
      ],
      order: [['updatedAt', 'DESC']],
    });

    const result = pages.map((p) => {
      const doc = toMongoLeanDoc(p);
      delete doc.createdByUser;
      delete doc.updatedByUser;
      doc.createdBy = p.createdByUser?.publicId || null;
      doc.updatedBy = p.updatedByUser?.publicId || null;
      return doc;
    });

    return res.json({ success: true, message: 'Pages fetched.', data: result });
  } catch (err) {
    console.error('getPages error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

export async function getOne(req, res) {
  try {
    const { id } = req.params;
    const page = await Page.findOne({
      where: { publicId: id },
      include: [
        { model: User, as: 'createdByUser', attributes: ['publicId'] },
        { model: User, as: 'updatedByUser', attributes: ['publicId'] },
      ],
    });
    if (!page) return res.status(404).json({ success: false, message: 'Page not found.', data: null });
    const doc = toMongoLeanDoc(page);
    delete doc.createdByUser;
    delete doc.updatedByUser;
    doc.createdBy = page.createdByUser?.publicId || null;
    doc.updatedBy = page.updatedByUser?.publicId || null;
    return res.json({ success: true, message: 'Page fetched.', data: doc });
  } catch (err) {
    console.error('getPage error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

export async function getPublic(req, res) {
  try {
    const { path } = req.query;
    const norm = normalizePath(path);
    if (!norm) {
      return res.status(400).json({ success: false, message: 'Path is required.', data: null });
    }
    const page = await Page.findOne({
      where: { path: norm, isPublished: true },
      include: [
        { model: User, as: 'createdByUser', attributes: ['publicId'] },
        { model: User, as: 'updatedByUser', attributes: ['publicId'] },
      ],
    });
    if (!page) return res.status(404).json({ success: false, message: 'Page not found.', data: null });
    const doc = toMongoLeanDoc(page);
    delete doc.createdByUser;
    delete doc.updatedByUser;
    doc.createdBy = page.createdByUser?.publicId || null;
    doc.updatedBy = page.updatedByUser?.publicId || null;
    return res.json({ success: true, message: 'Page fetched.', data: doc });
  } catch (err) {
    console.error('getPublicPage error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

export async function listPublic(req, res) {
  try {
    const { section } = req.query;
    const s = normalizePath(section);
    if (!s) {
      return res.status(400).json({ success: false, message: 'Section is required.', data: null });
    }

    const pages = await Page.findAll({
      where: { isPublished: true, path: { [Op.like]: `${s}/%` } },
      attributes: ['publicId', 'path', 'title', 'excerpt', 'updatedAt', 'createdAt'],
      order: [['path', 'ASC']],
    });

    const result = pages.map((p) => {
      const doc = toMongoLeanDoc(p);
      return doc;
    });

    return res.json({ success: true, message: 'Pages fetched.', data: result });
  } catch (err) {
    console.error('listPublicPages error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

export async function create(req, res) {
  try {
    const { path, title, excerpt, content_html, contentHtml, blocks, is_published, isPublished } = req.body || {};
    const normPath = normalizePath(path);
    const cleanTitle = String(title || '').trim();
    if (!normPath) return res.status(400).json({ success: false, message: 'Path wajib diisi.', data: null });
    if (!cleanTitle) return res.status(400).json({ success: false, message: 'Judul wajib diisi.', data: null });

    const exists = await Page.findOne({ where: { path: normPath }, attributes: ['id'] });
    if (exists) {
      return res.status(409).json({ success: false, message: 'Path sudah dipakai.', data: null });
    }

    const html = contentHtml ?? content_html ?? null;
    const creatorDbId = req.user?._dbId || null;
    const creatorPublicId = req.user?._id || req.user?.id || null;
    const pageRow = await Page.create({
      path: normPath,
      title: cleanTitle,
      excerpt: excerpt ? String(excerpt).trim() : null,
      contentHtml: html ? String(html) : null,
      blocks: coerceBlocks(blocks),
      isPublished: isPublished !== undefined ? Boolean(isPublished) : (is_published !== undefined ? Boolean(Number(is_published)) : true),
      createdBy: creatorDbId,
      updatedBy: creatorDbId,
    });

    const page = toMongoDoc(pageRow);
    page.createdBy = creatorPublicId;
    page.updatedBy = creatorPublicId;
    return res.status(201).json({ success: true, message: 'Page created.', data: page });
  } catch (err) {
    console.error('createPage error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

export async function update(req, res) {
  try {
    const { id } = req.params;
    const page = await Page.findOne({ where: { publicId: id } });
    if (!page) return res.status(404).json({ success: false, message: 'Page not found.', data: null });

    const { path, title, excerpt, content_html, contentHtml, blocks, is_published, isPublished } = req.body || {};
    const updates = {};

    if (path !== undefined) {
      const norm = normalizePath(path);
      if (!norm) return res.status(400).json({ success: false, message: 'Path tidak valid.', data: null });
      if (norm !== page.path) {
        const exists = await Page.findOne({ where: { path: norm }, attributes: ['id'] });
        if (exists) return res.status(409).json({ success: false, message: 'Path sudah dipakai.', data: null });
      }
      updates.path = norm;
    }
    if (title !== undefined) {
      const t = String(title || '').trim();
      if (!t) return res.status(400).json({ success: false, message: 'Judul tidak boleh kosong.', data: null });
      updates.title = t;
    }
    if (excerpt !== undefined) updates.excerpt = excerpt ? String(excerpt).trim() : null;
    if (contentHtml !== undefined || content_html !== undefined) {
      const html = contentHtml ?? content_html ?? null;
      updates.contentHtml = html ? String(html) : null;
    }
    if (blocks !== undefined) updates.blocks = coerceBlocks(blocks);
    if (isPublished !== undefined) updates.isPublished = Boolean(isPublished);
    if (is_published !== undefined) updates.isPublished = Boolean(Number(is_published));
    updates.updatedBy = req.user?._dbId || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update.', data: null });
    }

    await Page.update(updates, { where: { id: page.id } });
    const refreshed = await Page.findByPk(page.id, {
      include: [
        { model: User, as: 'createdByUser', attributes: ['publicId'] },
        { model: User, as: 'updatedByUser', attributes: ['publicId'] },
      ],
    });
    const upd = toMongoDoc(refreshed);
    delete upd.createdByUser;
    delete upd.updatedByUser;
    upd.createdBy = refreshed.createdByUser?.publicId || null;
    upd.updatedBy = refreshed.updatedByUser?.publicId || null;
    return res.json({ success: true, message: 'Page updated.', data: upd });
  } catch (err) {
    console.error('updatePage error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}

export async function remove(req, res) {
  try {
    const { id } = req.params;
    const page = await Page.findOne({ where: { publicId: id }, attributes: ['id'] });
    if (!page) return res.status(404).json({ success: false, message: 'Page not found.', data: null });
    await Page.destroy({ where: { id: page.id } });
    return res.json({ success: true, message: 'Page deleted.', data: null });
  } catch (err) {
    console.error('deletePage error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error.', data: null });
  }
}
