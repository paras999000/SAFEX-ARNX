import { Request, Response, NextFunction } from 'express';
import { traineesService } from '../services/trainees.service';

export class TraineesController {
  async upsert(req: Request, res: Response, next: NextFunction) {
    try {
      const { traineeId, name, language, deviceId, isDemo } = req.body;
      const result = await traineesService.upsertTrainee({
        traineeId,
        name,
        language,
        deviceId,
        isDemo,
      });

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[TraineesController.upsert Error]', err?.message || err);
      const isValidationError = err.message && err.message.includes('required');
      res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: err.message || 'Failed to upsert trainee in PostgreSQL',
      });
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const trainees = await traineesService.getAllTrainees();
      res.status(200).json({
        success: true,
        data: trainees,
      });
    } catch (err: any) {
      console.error('[TraineesController.getAll Error]', err?.message || err);
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch trainees from PostgreSQL',
      });
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { traineeId } = req.params;
      const trainee = await traineesService.getTraineeById(traineeId);
      res.status(200).json({
        success: true,
        data: trainee,
      });
    } catch (err: any) {
      console.error('[TraineesController.getById Error]', err?.message || err);
      const isNotFound = err.message && err.message.includes('not found');
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        message: err.message || 'Trainee not found in PostgreSQL',
      });
    }
  }
}

export const traineesController = new TraineesController();
