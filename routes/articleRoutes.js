import { Router } from 'express';
import * as articleController from '../controllers/articleController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/articles
router.get('/', articleController.getAll);

// GET /api/articles/:id
router.get('/:id', articleController.getOne);

// POST /api/articles (admin/teacher only)
router.post('/', requireRole(['admin', 'teacher']), articleController.create);

// PUT /api/articles/:id (admin/teacher only)
router.put('/:id', requireRole(['admin', 'teacher']), articleController.update);

// DELETE /api/articles/:id (admin/teacher only)
router.delete('/:id', requireRole(['admin', 'teacher']), articleController.deleteArticle);

export default router;
