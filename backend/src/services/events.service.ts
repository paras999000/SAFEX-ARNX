import { prisma, isDatabaseConnected } from '../prisma/client';
import { memoryStore } from './store';

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

    if (isDatabaseConnected()) {
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

        memoryStore.addEvent({
          sessionId,
          eventType: data.eventType,
          eventData: data.eventData || {},
          timestamp: eventDate,
        });

        return event;
      } catch {}
    }

    let s = memoryStore.sessions.find((x) => x.sessionId === sessionId);
    if (!s) {
      memoryStore.upsertSession({
        sessionId,
        traineeId: 'TR-2141',
        module: data.eventData?.module?.toUpperCase() || 'GAS',
        startedAt: eventDate,
      });
    }

    const evt = memoryStore.addEvent({
      sessionId,
      eventType: data.eventType,
      eventData: data.eventData || {},
      timestamp: eventDate,
    });

    return evt;
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
    if (isDatabaseConnected()) {
      try {
        return await prisma.trainingEvent.findMany({
          where: { sessionId },
          orderBy: { timestamp: 'asc' },
        });
      } catch {}
    }

    return memoryStore.events.filter((e) => e.sessionId === sessionId);
  }

  async getRecentEvents(limit: number = 20) {
    if (isDatabaseConnected()) {
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
      } catch {}
    }

    return memoryStore.events
      .slice()
      .reverse()
      .slice(0, limit)
      .map((e) => {
        const session = memoryStore.sessions.find((s) => s.sessionId === e.sessionId);
        const trainee = session ? memoryStore.trainees.find((t) => t.traineeId === session.traineeId) : null;
        return {
          ...e,
          session: session ? { ...session, trainee } : null,
        };
      });
  }
}

export const eventsService = new EventsService();
