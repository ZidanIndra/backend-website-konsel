import { Router } from 'express';
import ImageAsset from '../models/ImageAsset.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { buildDataUrl, stripDataUrlPrefix, validateImagePayload } from '../utils/image.js';

const router = Router();

const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2MB

function parseImageBody(body) {
  const base64 = stripDataUrlPrefix(body.image_base64 || body.base64 || body.dataUrl || '');
  const type = body.image_type || body.type || body.mimeType || null;
  const size = Number(body.image_size || body.size || 0);
  const purpose = body.purpose || 'generic';
  return { base64, type, size, purpose };
}

// POST /api/uploads/images (admin/teacher)
router.post('/images', requireRole(['admin', 'teacher']), async (req, res) => {
  try {
    const { base64, type, size, purpose } = parseImageBody(req.body || {});
    validateImagePayload({ base64, type, size, maxSizeBytes: MAX_IMAGE_BYTES });

    const ownerId = req.user?._dbId || null;
    const image = await ImageAsset.create({
      ownerId,
      purpose: purpose || 'article_inline',
      imageBase64: base64,
      imageType: type,
      imageSize: size || Buffer.byteLength(base64, 'base64'),
    });

    return res.json({
      success: true,
      message: 'Upload berhasil.',
      data: {
        image_id: image.publicId,
        image_base64: image.imageBase64,
        image_type: image.imageType,
        image_size: image.imageSize,
        data_url: buildDataUrl(image.imageType, image.imageBase64),
      },
    });
  } catch (err) {
    console.error('upload image error:', err);
    const message =
      err.code === 'UNSUPPORTED_IMAGE_TYPE'
        ? err.message
        : err.code === 'IMAGE_TOO_LARGE'
          ? `Ukuran gambar melebihi ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.`
          : 'Upload gagal.';
    return res.status(400).json({ success: false, message, data: null });
  }
});

// POST /api/uploads/avatar (any authenticated)
router.post('/avatar', requireAuth(), async (req, res) => {
  try {
    const { base64, type, size } = parseImageBody(req.body || {});
    validateImagePayload({ base64, type, size, maxSizeBytes: MAX_IMAGE_BYTES });

    const ownerId = req.user?._dbId || null;
    const image = await ImageAsset.create({
      ownerId,
      purpose: 'avatar',
      imageBase64: base64,
      imageType: type,
      imageSize: size || Buffer.byteLength(base64, 'base64'),
    });

    return res.json({
      success: true,
      message: 'Upload berhasil.',
      data: {
        image_id: image.publicId,
        image_base64: image.imageBase64,
        image_type: image.imageType,
        image_size: image.imageSize,
        data_url: buildDataUrl(image.imageType, image.imageBase64),
      },
    });
  } catch (err) {
    console.error('upload avatar error:', err);
    const message =
      err.code === 'UNSUPPORTED_IMAGE_TYPE'
        ? err.message
        : err.code === 'IMAGE_TOO_LARGE'
          ? `Ukuran gambar melebihi ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.`
          : 'Upload gagal.';
    return res.status(400).json({ success: false, message, data: null });
  }
});

// GET /api/uploads/:id
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const imageRow = await ImageAsset.findOne({ where: { publicId: id } });
    const image = imageRow ? imageRow.get({ plain: true }) : null;
    if (!image) {
      return res.status(404).json({ success: false, message: 'Image not found.', data: null });
    }

    return res.json({
      success: true,
      message: 'Image fetched.',
      data: {
        image_id: image.publicId,
        image_base64: image.imageBase64,
        image_type: image.imageType,
        image_size: image.imageSize,
        data_url: buildDataUrl(image.imageType, image.imageBase64),
      },
    });
  } catch (err) {
    console.error('get image error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch image.', data: null });
  }
});

// DELETE /api/uploads/:id (owner/admin/teacher)
router.delete('/:id', requireAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const image = await ImageAsset.findOne({ where: { publicId: id } });
    if (!image) {
      return res.status(404).json({ success: false, message: 'Image not found.', data: null });
    }

    const ownerId = image.ownerId;
    const userId = req.user?._dbId;
    const isPrivileged = ['admin', 'teacher'].includes(req.user?.role);

    if (ownerId && Number(ownerId) !== Number(userId) && !isPrivileged) {
      return res.status(403).json({ success: false, message: 'Forbidden.', data: null });
    }

    await image.destroy();
    return res.json({ success: true, message: 'Image deleted.', data: null });
  } catch (err) {
    console.error('delete image error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete image.', data: null });
  }
});

export default router;
