import { prisma, isDatabaseConnected } from '../prisma/client';
import { memoryStore } from './store';

export class TraineesService {
  async upsertTrainee(data: {
    traineeId: string;
    name: string;
    language: string;
    deviceId?: string;
    isDemo?: boolean;
  }) {
    if (!data.traineeId || !data.name) {
      throw new Error('traineeId and name are required');
    }

    let lang = data.language ? data.language.toLowerCase().trim() : 'en';
    if (lang === 'santali') lang = 'sat';
    if (lang === 'hindi') lang = 'hi';
    if (lang === 'english') lang = 'en';

    if (isDatabaseConnected()) {
      try {
        const trainee = await prisma.trainee.upsert({
          where: { traineeId: data.traineeId },
          update: {
            name: data.name,
            language: lang,
            deviceId: data.deviceId ?? null,
          },
          create: {
            traineeId: data.traineeId,
            name: data.name,
            language: lang,
            deviceId: data.deviceId ?? null,
            isDemo: data.isDemo ?? false,
          },
        });
        memoryStore.upsertTrainee({
          traineeId: data.traineeId,
          name: data.name,
          language: lang,
          deviceId: data.deviceId,
          isDemo: data.isDemo,
        });
        return trainee;
      } catch {}
    }

    return memoryStore.upsertTrainee({
      traineeId: data.traineeId,
      name: data.name,
      language: lang,
      deviceId: data.deviceId,
      isDemo: data.isDemo,
    });
  }

  async getAllTrainees() {
    if (isDatabaseConnected()) {
      try {
        return await prisma.trainee.findMany({
          include: {
            sessions: {
              orderBy: { startedAt: 'desc' },
              take: 5,
            },
            certificates: {
              orderBy: { issuedAt: 'desc' },
            },
          },
          orderBy: { updatedAt: 'desc' },
        });
      } catch {}
    }

    return memoryStore.trainees.map((t) => ({
      ...t,
      sessions: memoryStore.sessions.filter((s) => s.traineeId === t.traineeId),
      certificates: memoryStore.certificates.filter((c) => c.traineeId === t.traineeId),
    }));
  }

  async getTraineeById(traineeId: string) {
    if (isDatabaseConnected()) {
      try {
        const trainee = await prisma.trainee.findUnique({
          where: { traineeId },
          include: {
            sessions: {
              orderBy: { startedAt: 'desc' },
              include: {
                events: {
                  orderBy: { timestamp: 'asc' },
                },
                assessments: true,
              },
            },
            certificates: {
              orderBy: { issuedAt: 'desc' },
            },
          },
        });
        if (trainee) return trainee;
      } catch {}
    }

    const t = memoryStore.trainees.find((x) => x.traineeId === traineeId);
    if (!t) {
      throw new Error(`Trainee not found with id: ${traineeId}`);
    }

    return {
      ...t,
      sessions: memoryStore.sessions
        .filter((s) => s.traineeId === t.traineeId)
        .map((s) => ({
          ...s,
          events: memoryStore.events.filter((e) => e.sessionId === s.sessionId),
          assessments: memoryStore.assessments.filter((a) => a.sessionId === s.sessionId),
        })),
      certificates: memoryStore.certificates.filter((c) => c.traineeId === t.traineeId),
    };
  }
}

export const traineesService = new TraineesService();
