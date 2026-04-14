import { Router } from 'express';
import * as messageController from '../controllers/messageController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// GET /api/messages?session_id=X&last_id=Y
router.get('/', requireAuth(), messageController.getMessages);

// POST /api/messages
router.post('/', requireAuth(), messageController.send);

// PUT /api/messages/:id/read
router.put('/:id/read', requireAuth(), messageController.markRead);

export default router;
