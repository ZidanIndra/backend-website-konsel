import { Router } from 'express';
import * as pageController from '../controllers/pageController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// Public fetch by path: /api/pages/public?path=profil/ekstrakurikuler
router.get('/public/list', pageController.listPublic);
router.get('/public', pageController.getPublic);

// Admin CRUD
router.get('/', requireRole(['admin']), pageController.getAll);
router.post('/', requireRole(['admin']), pageController.create);
router.get('/:id', requireRole(['admin']), pageController.getOne);
router.put('/:id', requireRole(['admin']), pageController.update);
router.delete('/:id', requireRole(['admin']), pageController.remove);

export default router;
