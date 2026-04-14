import { Router } from 'express';
import * as userController from '../controllers/userController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/users
router.get('/', requireAuth(), userController.getAll);

// GET /api/users/:id
router.get('/:id', requireAuth(), userController.getOne);

// POST /api/users (admin only)
router.post('/', requireRole(['admin']), userController.create);

// PUT /api/users/:id
router.put('/:id', requireAuth(), userController.update);

// DELETE /api/users/:id (admin only)
router.delete('/:id', requireRole(['admin']), userController.deleteUser);

export default router;
