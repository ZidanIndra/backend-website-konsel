import { Router } from 'express';
import * as questionController from '../controllers/questionController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/questions
router.get('/', questionController.getAll);

// GET /api/questions/:id
router.get('/:id', questionController.getOne);

// POST /api/questions (teacher/admin only)
router.post('/', requireRole(['teacher', 'admin']), questionController.create);

// PUT /api/questions/:id (teacher/admin only)
router.put('/:id', requireRole(['teacher', 'admin']), questionController.update);

// DELETE /api/questions/:id (teacher/admin only)
router.delete('/:id', requireRole(['teacher', 'admin']), questionController.deleteQuestion);

export default router;
