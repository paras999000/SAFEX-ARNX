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
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to upsert trainee',
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
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch trainees',
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
      res.status(404).json({
        success: false,
        message: err.message || 'Trainee not found',
      });
    }
  }
}

export const traineesController = new TraineesController();
