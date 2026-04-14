import { Router } from 'express';
import * as authController from '../controllers/authController.js';

const router = Router();

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/register
router.post('/register', authController.register);

// GET /api/auth/me
router.get('/me', authController.me);

export default router;
