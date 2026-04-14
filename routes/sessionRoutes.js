import { Router } from 'express';
import * as sessionController from '../controllers/sessionController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/sessions
router.get('/', requireAuth(), sessionController.getAll);

// GET /api/sessions/:id
router.get('/:id', requireAuth(), sessionController.getOne);

// POST /api/sessions (student only)
router.post('/', requireRole('student'), sessionController.create);

// PUT /api/sessions/:id
router.put('/:id', requireAuth(), sessionController.update);

// DELETE /api/sessions/:id (teacher/admin only)
router.delete('/:id', requireRole(['teacher', 'admin']), sessionController.deleteSession);

export default router;
