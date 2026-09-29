import { prisma } from '../prisma/client';

export class EventsService {
  async recordEvent(
    sessionId: string,
    data: {
      eventType: string;
      eventData?: any;
      timestamp?: string | Date;
    }
  ) {
    if (!sessionId || !data.eventType) {
      throw new Error('sessionId and eventType are required');
    }

    const eventDate = data.timestamp ? new Date(data.timestamp) : new Date();

    try {
      const existingSession = await prisma.trainingSession.findUnique({
        where: { sessionId },
      });

      if (!existingSession) {
        let trainee = await prisma.trainee.findFirst();
        if (!trainee) {
          trainee = await prisma.trainee.create({
            data: {
              traineeId: 'TR-AUTO-01',
              name: 'SAFEX Field Operator',
              language: 'sat',
            },
          });
        }

        await prisma.trainingSession.create({
          data: {
            sessionId,
            traineeId: trainee.traineeId,
            module: data.eventData?.module?.toUpperCase() || 'GAS',
            status: 'IN_PROGRESS',
          },
        });
      }

      const event = await prisma.trainingEvent.create({
        data: {
          sessionId,
          eventType: data.eventType,
          eventData: data.eventData || {},
          timestamp: eventDate,
        },
      });

      return event;
    } catch (err: any) {
      console.error(`[PostgreSQL ERROR] Failed to record event for session ${sessionId}:`, err?.message || err);
      throw new Error(`Database error recording event: ${err?.message || 'Unknown error'}`);
    }
  }

  async recordBatchEvents(
    sessionId: string,
    events: Array<{
      eventType: string;
      eventData?: any;
      timestamp?: string | Date;
    }>
  ) {
    const results = [];
    for (const evt of events) {
      const res = await this.recordEvent(sessionId, evt);
      results.push(res);
    }
    return results;
  }

  async getEventsBySession(sessionId: string) {
    try {
      return await prisma.trainingEvent.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' },
      });
    } catch (err: any) {
      console.error(`[PostgreSQL ERROR] Failed to get events for session ${sessionId}:`, err?.message || err);
      throw new Error(`Database error fetching events: ${err?.message || 'Unknown error'}`);
    }
  }

  async getRecentEvents(limit: number = 20) {
    try {
      return await prisma.trainingEvent.findMany({
        include: {
          session: {
            include: {
              trainee: true,
            },
          },
        },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });
    } catch (err: any) {
      console.error('[PostgreSQL ERROR] Failed to get recent events:', err?.message || err);
      throw new Error(`Database error fetching recent events: ${err?.message || 'Unknown error'}`);
    }
  }
}

export const eventsService = new EventsService();
