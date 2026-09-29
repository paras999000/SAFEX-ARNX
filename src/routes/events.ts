import { Router } from 'express';
import { eventsController } from '../controllers/events.controller';

const router = Router();

// GET /api/events - Get recent events across sessions
router.get('/', (req, res, next) => eventsController.getRecent(req, res, next));

// POST /api/events/:sessionId - Record training event for session
router.post('/:sessionId', (req, res, next) => eventsController.record(req, res, next));

// GET /api/events/:sessionId - Get events for session
router.get('/:sessionId', (req, res, next) => eventsController.getBySession(req, res, next));

export default router;
