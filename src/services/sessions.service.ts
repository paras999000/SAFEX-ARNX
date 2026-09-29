import { prisma, isDatabaseConnected } from '../prisma/client';
import { memoryStore } from './store';

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

    if (isDatabaseConnected()) {
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

        memoryStore.upsertSession({
          sessionId: data.sessionId,
          traineeId: data.traineeId,
          module: normModule,
          startedAt: started,
          isDemo: data.isDemo,
        });

        return session;
      } catch {}
    }

    const trainee = memoryStore.trainees.find((t) => t.traineeId === data.traineeId);
    if (!trainee) {
      memoryStore.upsertTrainee({
        traineeId: data.traineeId,
        name: `Trainee ${data.traineeId}`,
        language: 'sat',
      });
    }

    const rec = memoryStore.upsertSession({
      sessionId: data.sessionId,
      traineeId: data.traineeId,
      module: normModule,
      startedAt: started,
      isDemo: data.isDemo,
    });

    return {
      ...rec,
      trainee: memoryStore.trainees.find((t) => t.traineeId === data.traineeId),
    };
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

    if (isDatabaseConnected()) {
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

        memoryStore.updateSession(sessionId, updatePayload);
        return session;
      } catch {}
    }

    const s = memoryStore.updateSession(sessionId, updatePayload);
    if (!s) throw new Error(`Training session not found with id: ${sessionId}`);
    return {
      ...s,
      trainee: memoryStore.trainees.find((t) => t.traineeId === s.traineeId),
      events: memoryStore.events.filter((e) => e.sessionId === s.sessionId),
      assessments: memoryStore.assessments.filter((a) => a.sessionId === s.sessionId),
    };
  }

  async getSessions(filters: {
    module?: string;
    status?: string;
    language?: string;
    traineeId?: string;
    date?: string;
    limit?: number;
  }) {
    if (isDatabaseConnected()) {
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
      } catch {}
    }

    let filtered = [...memoryStore.sessions];

    if (filters.module) {
      filtered = filtered.filter((s) => s.module.toUpperCase() === filters.module!.toUpperCase());
    }
    if (filters.status) {
      filtered = filtered.filter((s) => s.status.toUpperCase() === filters.status!.toUpperCase());
    }
    if (filters.traineeId) {
      filtered = filtered.filter((s) => s.traineeId === filters.traineeId);
    }
    if (filters.language) {
      const l = filters.language.toLowerCase();
      const norm = l === 'santali' ? 'sat' : l === 'hindi' ? 'hi' : l === 'english' ? 'en' : l;
      filtered = filtered.filter((s) => {
        const t = memoryStore.trainees.find((tr) => tr.traineeId === s.traineeId);
        return t && t.language === norm;
      });
    }

    return filtered.slice(0, filters.limit || 50).map((s) => ({
      ...s,
      trainee: memoryStore.trainees.find((t) => t.traineeId === s.traineeId),
      events: memoryStore.events.filter((e) => e.sessionId === s.sessionId).slice(0, 5),
      assessments: memoryStore.assessments.filter((a) => a.sessionId === s.sessionId),
      certificate: memoryStore.certificates.find((c) => c.certificateId === s.certificateId),
    }));
  }

  async getSessionById(sessionId: string) {
    if (isDatabaseConnected()) {
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
        if (session) return session;
      } catch {}
    }

    const s = memoryStore.sessions.find((x) => x.sessionId === sessionId);
    if (!s) {
      throw new Error(`Training session not found with id: ${sessionId}`);
    }

    return {
      ...s,
      trainee: memoryStore.trainees.find((t) => t.traineeId === s.traineeId),
      events: memoryStore.events.filter((e) => e.sessionId === s.sessionId),
      assessments: memoryStore.assessments.filter((a) => a.sessionId === s.sessionId),
      certificate: memoryStore.certificates.find((c) => c.certificateId === s.certificateId),
    };
  }
}

export const sessionsService = new SessionsService();
