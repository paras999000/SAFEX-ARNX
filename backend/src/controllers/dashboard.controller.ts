import { Request, Response, NextFunction } from 'express';
import { dashboardService } from '../services/dashboard.service';

export class DashboardController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const overview = await dashboardService.getOverview();
      res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch dashboard overview',
      });
    }
  }

  async getTrainingTrend(req: Request, res: Response, next: NextFunction) {
    try {
      const trend = await dashboardService.getTrainingTrend();
      res.status(200).json({
        success: true,
        data: trend,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch training trend',
      });
    }
  }

  async getRecentSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const recent = await dashboardService.getRecentSessions(limit);
      res.status(200).json({
        success: true,
        data: recent,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch recent sessions',
      });
    }
  }

  async getModuleStats(req: Request, res: Response, next: NextFunction) {
    try {
      const moduleStats = await dashboardService.getModuleStats();
      res.status(200).json({
        success: true,
        data: moduleStats,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch module statistics',
      });
    }
  }

  async getLanguageStats(req: Request, res: Response, next: NextFunction) {
    try {
      const languageStats = await dashboardService.getLanguageStats();
      res.status(200).json({
        success: true,
        data: languageStats,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch language statistics',
      });
    }
  }
}

export const dashboardController = new DashboardController();
