import { Router } from 'express';
import { traineesController } from '../controllers/trainees.controller';

const router = Router();

// POST /api/trainees - Create or update trainee
router.post('/', (req, res, next) => traineesController.upsert(req, res, next));

// GET /api/trainees - Return all trainees
router.get('/', (req, res, next) => traineesController.getAll(req, res, next));

// GET /api/trainees/:traineeId - Return one trainee and training history
router.get('/:traineeId', (req, res, next) => traineesController.getById(req, res, next));

export default router;
