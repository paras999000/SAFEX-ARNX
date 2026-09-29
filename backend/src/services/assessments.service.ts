import { prisma, isDatabaseConnected } from '../prisma/client';
import { memoryStore } from './store';

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

    if (isDatabaseConnected()) {
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

        memoryStore.addAssessment({
          sessionId: data.sessionId,
          module: normModule,
          completedActions: data.completedActions || [],
          requiredActions: data.requiredActions,
          passed: passedVal,
          score: scoreVal,
          durationSeconds: durVal,
        });

        memoryStore.updateSession(data.sessionId, {
          assessmentPassed: passedVal,
          durationSeconds: durVal,
          status: passedVal ? 'COMPLETED' : 'FAILED',
          completedAt: new Date().toISOString(),
        });

        return assessment;
      } catch {}
    }

    memoryStore.updateSession(data.sessionId, {
      assessmentPassed: passedVal,
      durationSeconds: durVal,
      status: passedVal ? 'COMPLETED' : 'FAILED',
      completedAt: new Date().toISOString(),
    });

    const item = memoryStore.addAssessment({
      sessionId: data.sessionId,
      module: normModule,
      completedActions: data.completedActions || [],
      requiredActions: data.requiredActions,
      passed: passedVal,
      score: scoreVal,
      durationSeconds: durVal,
    });

    return item;
  }

  async getAssessments() {
    if (isDatabaseConnected()) {
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
      } catch {}
    }

    return memoryStore.assessments.map((a) => {
      const session = memoryStore.sessions.find((s) => s.sessionId === a.sessionId);
      const trainee = session ? memoryStore.trainees.find((t) => t.traineeId === session.traineeId) : null;
      return {
        ...a,
        session: session ? { ...session, trainee } : null,
      };
    });
  }
}

export const assessmentsService = new AssessmentsService();
