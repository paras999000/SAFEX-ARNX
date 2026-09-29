import { Router } from 'express';
import { sessionsController } from '../controllers/sessions.controller';
import { eventsController } from '../controllers/events.controller';

const router = Router();

// POST /api/sessions - Start a training session
router.post('/', (req, res, next) => sessionsController.start(req, res, next));

// PATCH /api/sessions/:sessionId - Update session status / duration / passed
router.patch('/:sessionId', (req, res, next) => sessionsController.update(req, res, next));

// GET /api/sessions - Return recent training sessions with filters
router.get('/', (req, res, next) => sessionsController.getAll(req, res, next));

// GET /api/sessions/:sessionId - Return session details
router.get('/:sessionId', (req, res, next) => sessionsController.getById(req, res, next));

// POST /api/sessions/:sessionId/events - Record training event
router.post('/:sessionId/events', (req, res, next) => eventsController.record(req, res, next));

// GET /api/sessions/:sessionId/events - Get events for session
router.get('/:sessionId/events', (req, res, next) => eventsController.getBySession(req, res, next));

export default router;
