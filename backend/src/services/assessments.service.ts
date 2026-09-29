import { prisma } from '../prisma/client';

export class AssessmentsService {
  async recordAssessment(data: {
    sessionId: string;
    module: string;
    completedActions: string[];
    requiredActions?: string[];
    score: number;
    passed: boolean;
    durationSeconds?: number;
  }) {
    if (!data.sessionId || !data.module) {
      throw new Error('sessionId and module are required');
    }

    const normModule = data.module.toUpperCase().includes('FIRE') ? 'FIRE' : 'GAS';
    const scoreVal = Number(data.score) || 0;
    const durVal = Number(data.durationSeconds) || 0;
    const passedVal = Boolean(data.passed);

    try {
      const existingSession = await prisma.trainingSession.findUnique({
        where: { sessionId: data.sessionId },
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
            sessionId: data.sessionId,
            traineeId: trainee.traineeId,
            module: normModule,
            status: passedVal ? 'COMPLETED' : 'FAILED',
            assessmentPassed: passedVal,
            durationSeconds: durVal,
            completedAt: new Date(),
          },
        });
      } else {
        await prisma.trainingSession.update({
          where: { sessionId: data.sessionId },
          data: {
            assessmentPassed: passedVal,
            durationSeconds: durVal || existingSession.durationSeconds,
            status: passedVal ? 'COMPLETED' : 'FAILED',
            completedAt: new Date(),
          },
        });
      }

      const assessment = await prisma.assessment.create({
        data: {
          sessionId: data.sessionId,
          module: normModule,
          completedActions: data.completedActions || [],
          requiredActions: data.requiredActions ? data.requiredActions : undefined,
          passed: passedVal,
          score: scoreVal,
          durationSeconds: durVal,
        },
      });

      return assessment;
    } catch (err: any) {
      console.error(`[PostgreSQL ERROR] Failed to record assessment for session ${data.sessionId}:`, err?.message || err);
      throw new Error(`Database error recording assessment: ${err?.message || 'Unknown error'}`);
    }
  }

  async getAssessments() {
    try {
      return await prisma.assessment.findMany({
        include: {
          session: {
            include: {
              trainee: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (err: any) {
      console.error('[PostgreSQL ERROR] Failed to fetch assessments:', err?.message || err);
      throw new Error(`Database error fetching assessments: ${err?.message || 'Unknown error'}`);
    }
  }
}

export const assessmentsService = new AssessmentsService();
