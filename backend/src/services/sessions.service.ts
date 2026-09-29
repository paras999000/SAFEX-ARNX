import { prisma } from '../prisma/client';

export class SessionsService {
  async startSession(data: {
    sessionId: string;
    traineeId: string;
    module: string;
    startedAt?: string | Date;
    isDemo?: boolean;
  }) {
    if (!data.sessionId || !data.traineeId || !data.module) {
      throw new Error('sessionId, traineeId, and module are required');
    }

    const normModule = data.module.toUpperCase().includes('FIRE') ? 'FIRE' : 'GAS';
    const started = data.startedAt ? new Date(data.startedAt) : new Date();

    try {
      const existingTrainee = await prisma.trainee.findUnique({
        where: { traineeId: data.traineeId },
      });

      if (!existingTrainee) {
        await prisma.trainee.create({
          data: {
            traineeId: data.traineeId,
            name: `Trainee ${data.traineeId}`,
            language: 'sat',
            isDemo: data.isDemo ?? false,
          },
        });
      }

      const session = await prisma.trainingSession.upsert({
        where: { sessionId: data.sessionId },
        update: {
          traineeId: data.traineeId,
          module: normModule,
          status: 'IN_PROGRESS',
        },
        create: {
          sessionId: data.sessionId,
          traineeId: data.traineeId,
          module: normModule,
          status: 'STARTED',
          startedAt: started,
          isDemo: data.isDemo ?? false,
        },
        include: {
          trainee: true,
        },
      });

      console.log(`[PostgreSQL] Session started & persisted: ${data.sessionId} (${normModule})`);
      return session;
    } catch (err: any) {
      console.error(`[PostgreSQL ERROR] Failed to start session ${data.sessionId}:`, err?.message || err);
      throw new Error(`Database error starting session: ${err?.message || 'Unknown error'}`);
    }
  }

  async updateSession(
    sessionId: string,
    data: {
      status?: string;
      completedAt?: string | Date;
      durationSeconds?: number;
      assessmentPassed?: boolean;
      certificateId?: string;
    }
  ) {
    const updatePayload: any = {};

    if (data.status) {
      updatePayload.status = data.status.toUpperCase();
    }
    if (data.completedAt) {
      updatePayload.completedAt = new Date(data.completedAt);
    } else if (data.status === 'COMPLETED' || data.status === 'FAILED') {
      updatePayload.completedAt = new Date();
    }
    if (typeof data.durationSeconds === 'number') {
      updatePayload.durationSeconds = data.durationSeconds;
    }
    if (typeof data.assessmentPassed === 'boolean') {
      updatePayload.assessmentPassed = data.assessmentPassed;
    }
    if (data.certificateId) {
      updatePayload.certificateId = data.certificateId;
    }

    try {
      const session = await prisma.trainingSession.update({
        where: { sessionId },
        data: updatePayload,
        include: {
          trainee: true,
          events: true,
          assessments: true,
        },
      });

      console.log(`[PostgreSQL] Session updated & persisted: ${sessionId}`);
      return session;
    } catch (err: any) {
      console.error(`[PostgreSQL ERROR] Failed to update session ${sessionId}:`, err?.message || err);
      throw new Error(`Database error updating session: ${err?.message || 'Unknown error'}`);
    }
  }

  async getSessions(filters: {
    module?: string;
    status?: string;
    language?: string;
    traineeId?: string;
    date?: string;
    limit?: number;
  }) {
    try {
      const where: any = {};

      if (filters.module) {
        where.module = filters.module.toUpperCase();
      }
      if (filters.status) {
        where.status = filters.status.toUpperCase();
      }
      if (filters.traineeId) {
        where.traineeId = filters.traineeId;
      }
      if (filters.language) {
        const l = filters.language.toLowerCase();
        const norm = l === 'santali' ? 'sat' : l === 'hindi' ? 'hi' : l === 'english' ? 'en' : l;
        where.trainee = { language: norm };
      }
      if (filters.date) {
        const startOfDay = new Date(filters.date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(filters.date);
        endOfDay.setHours(23, 59, 59, 999);
        where.startedAt = {
          gte: startOfDay,
          lte: endOfDay,
        };
      }

      return await prisma.trainingSession.findMany({
        where,
        include: {
          trainee: true,
          events: {
            orderBy: { timestamp: 'desc' },
            take: 5,
          },
          assessments: true,
          certificate: true,
        },
        orderBy: { startedAt: 'desc' },
        take: filters.limit || 50,
      });
    } catch (err: any) {
      console.error('[PostgreSQL ERROR] Failed to fetch sessions:', err?.message || err);
      throw new Error(`Database error fetching sessions: ${err?.message || 'Unknown error'}`);
    }
  }

  async getSessionById(sessionId: string) {
    try {
      const session = await prisma.trainingSession.findUnique({
        where: { sessionId },
        include: {
          trainee: true,
          events: {
            orderBy: { timestamp: 'asc' },
          },
          assessments: true,
          certificate: true,
        },
      });

      if (!session) {
        throw new Error(`Training session not found with id: ${sessionId}`);
      }

      return session;
    } catch (err: any) {
      console.error(`[PostgreSQL ERROR] Failed to get session ${sessionId}:`, err?.message || err);
      throw err;
    }
  }
}

export const sessionsService = new SessionsService();
