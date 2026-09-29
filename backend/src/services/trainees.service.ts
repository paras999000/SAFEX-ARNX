import { prisma } from '../prisma/client';

export class TraineesService {
  async upsertTrainee(data: {
    traineeId: string;
    name: string;
    language?: string;
    deviceId?: string;
    isDemo?: boolean;
  }) {
    const traineeId = data.traineeId ? String(data.traineeId).trim() : '';
    const name = data.name ? String(data.name).trim() : '';

    if (!traineeId || !name) {
      throw new Error('traineeId and name are required');
    }

    let lang = data.language ? String(data.language).toLowerCase().trim() : 'en';
    if (lang === 'santali') lang = 'sat';
    if (lang === 'hindi') lang = 'hi';
    if (lang === 'english') lang = 'en';

    try {
      const trainee = await prisma.trainee.upsert({
        where: { traineeId },
        update: {
          name,
          language: lang,
          deviceId: data.deviceId ?? null,
        },
        create: {
          traineeId,
          name,
          language: lang,
          deviceId: data.deviceId ?? null,
          isDemo: data.isDemo ?? false,
        },
        include: {
          sessions: {
            orderBy: { startedAt: 'desc' },
            take: 5,
          },
          certificates: {
            orderBy: { issuedAt: 'desc' },
          },
        },
      });

      console.log(`[PostgreSQL] Trainee persisted successfully: ${name} (${traineeId})`);
      return trainee;
    } catch (err: any) {
      console.error(`[PostgreSQL ERROR] Failed to persist trainee ${name} (${traineeId}):`, err?.message || err);
      throw new Error(`Database error while persisting trainee: ${err?.message || 'Unknown error'}`);
    }
  }

  async getAllTrainees() {
    try {
      const trainees = await prisma.trainee.findMany({
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
      return trainees;
    } catch (err: any) {
      console.error('[PostgreSQL ERROR] Failed to fetch trainees:', err?.message || err);
      throw new Error(`Database error while fetching trainees: ${err?.message || 'Unknown error'}`);
    }
  }

  async getTraineeById(traineeId: string) {
    const tid = String(traineeId).trim();
    try {
      const trainee = await prisma.trainee.findUnique({
        where: { traineeId: tid },
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

      if (!trainee) {
        throw new Error(`Trainee not found with id: ${tid}`);
      }

      return trainee;
    } catch (err: any) {
      console.error(`[PostgreSQL ERROR] Failed to get trainee ${tid}:`, err?.message || err);
      throw err;
    }
  }
}

export const traineesService = new TraineesService();
