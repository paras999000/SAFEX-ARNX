import { Router } from 'express';
import { certificatesController } from '../controllers/certificates.controller';

const router = Router();

// POST /api/certificates - Record issued certificate
router.post('/', (req, res, next) => certificatesController.issue(req, res, next));

// GET /api/certificates - Return all certificates
router.get('/', (req, res, next) => certificatesController.getAll(req, res, next));

// GET /api/certificates/:certificateId - Return certificate info for QR verification
router.get('/:certificateId', (req, res, next) => certificatesController.getById(req, res, next));

export default router;
