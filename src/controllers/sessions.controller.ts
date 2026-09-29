import { Request, Response, NextFunction } from 'express';
import { sessionsService } from '../services/sessions.service';

export class SessionsController {
  async start(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId, traineeId, module, startedAt, isDemo } = req.body;
      const session = await sessionsService.startSession({
        sessionId,
        traineeId,
        module,
        startedAt,
        isDemo,
      });

      res.status(201).json({
        success: true,
        data: session,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to start session',
      });
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { status, completedAt, durationSeconds, assessmentPassed, certificateId } = req.body;

      const session = await sessionsService.updateSession(sessionId, {
        status,
        completedAt,
        durationSeconds,
        assessmentPassed,
        certificateId,
      });

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to update session',
      });
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const { module, status, language, traineeId, date, limit } = req.query;

      const sessions = await sessionsService.getSessions({
        module: module ? String(module) : undefined,
        status: status ? String(status) : undefined,
        language: language ? String(language) : undefined,
        traineeId: traineeId ? String(traineeId) : undefined,
        date: date ? String(date) : undefined,
        limit: limit ? Number(limit) : undefined,
      });

      res.status(200).json({
        success: true,
        data: sessions,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch sessions',
      });
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const session = await sessionsService.getSessionById(sessionId);

      res.status(200).json({
        success: true,
        data: session,
      });
    } catch (err: any) {
      res.status(404).json({
        success: false,
        message: err.message || 'Training session not found',
      });
    }
  }
}

export const sessionsController = new SessionsController();
