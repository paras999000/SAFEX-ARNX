import { Router } from 'express';
import { assessmentsController } from '../controllers/assessments.controller';

const router = Router();

// POST /api/assessments - Record assessment result
router.post('/', (req, res, next) => assessmentsController.record(req, res, next));

// GET /api/assessments - Return all assessments
router.get('/', (req, res, next) => assessmentsController.getAll(req, res, next));

export default router;
