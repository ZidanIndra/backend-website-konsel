import { Router } from 'express';
import * as questionnaireController from '../controllers/questionnaireController.js';
import { requireRole } from '../middleware/auth.js';

const router = Router();

// GET /api/questionnaires
router.get('/', questionnaireController.getAll);

// GET /api/questionnaires/active
router.get('/active', questionnaireController.getActive);

// GET /api/questionnaires/:id
router.get('/:id', questionnaireController.getOne);

// POST /api/questionnaires (teacher/admin)
router.post('/', requireRole(['teacher', 'admin']), questionnaireController.create);

// PUT /api/questionnaires/:id (teacher/admin)
router.put('/:id', requireRole(['teacher', 'admin']), questionnaireController.update);

// DELETE /api/questionnaires/:id (teacher/admin)
router.delete('/:id', requireRole(['teacher', 'admin']), questionnaireController.remove);

export default router;
