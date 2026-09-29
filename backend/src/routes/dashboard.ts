import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';

const router = Router();

// GET /api/dashboard/overview - Key metrics and completion rate
router.get('/overview', (req, res, next) => dashboardController.getOverview(req, res, next));

// GET /api/dashboard/training-trend - Daily/weekly training statistics
router.get('/training-trend', (req, res, next) => dashboardController.getTrainingTrend(req, res, next));

// GET /api/dashboard/recent-sessions - Recent session list with trainee details
router.get('/recent-sessions', (req, res, next) => dashboardController.getRecentSessions(req, res, next));

// GET /api/dashboard/module-stats - Fire and Gas module completion & pass rates
router.get('/module-stats', (req, res, next) => dashboardController.getModuleStats(req, res, next));

// GET /api/dashboard/language-stats - English, Hindi, Santali breakdown
router.get('/language-stats', (req, res, next) => dashboardController.getLanguageStats(req, res, next));

export default router;
