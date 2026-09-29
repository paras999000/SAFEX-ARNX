import { Request, Response, NextFunction } from 'express';
import { eventsService } from '../services/events.service';

export class EventsController {
  async record(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const { eventType, eventData, timestamp, events } = req.body;

      // Support both single event or batch events array from Unity offline queue
      if (Array.isArray(events)) {
        const results = await eventsService.recordBatchEvents(sessionId, events);
        return res.status(201).json({
          success: true,
          data: results,
        });
      }

      const event = await eventsService.recordEvent(sessionId, {
        eventType,
        eventData,
        timestamp,
      });

      res.status(201).json({
        success: true,
        data: event,
      });
    } catch (err: any) {
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to record event',
      });
    }
  }

  async getBySession(req: Request, res: Response, next: NextFunction) {
    try {
      const { sessionId } = req.params;
      const events = await eventsService.getEventsBySession(sessionId);

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch session events',
      });
    }
  }

  async getRecent(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const events = await eventsService.getRecentEvents(limit);

      res.status(200).json({
        success: true,
        data: events,
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch recent events',
      });
    }
  }
}

export const eventsController = new EventsController();
