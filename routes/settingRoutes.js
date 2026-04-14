import { Router } from 'express';
import * as settingController from '../controllers/settingController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/settings
router.get('/', settingController.get);

// PUT /api/settings (admin only)
router.put('/', requireRole(['admin']), settingController.update);

export default router;
