import { Router } from 'express';
import * as responseController from '../controllers/responseController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/responses
router.get('/', requireAuth(), responseController.getAll);

// GET /api/responses/:id
router.get('/:id', requireAuth(), responseController.getOne);

// POST /api/responses (student only)
router.post('/', requireRole('student'), responseController.submit);

// DELETE /api/responses/:id (owner or teacher/admin)
router.delete('/:id', requireAuth(), responseController.remove);

export default router;
