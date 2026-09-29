import { Request, Response, NextFunction } from 'express';
import { assessmentsService } from '../services/assessments.service';

export class AssessmentsController {
  async record(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        sessionId,
        module,
        completedActions,
        requiredActions,
        score,
        passed,
        durationSeconds,
      } = req.body;

      const assessment = await assessmentsService.recordAssessment({
        sessionId,
        module,
        completedActions,
        requiredActions,
        score,
        passed,
        durationSeconds,
      });

      res.status(201).json({
        success: true,
        data: assessment,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to record assessment',
      });
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const assessments = await assessmentsService.getAssessments();
      res.status(200).json({
        success: true,
        data: assessments,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch assessments',
      });
    }
  }
}

export const assessmentsController = new AssessmentsController();
