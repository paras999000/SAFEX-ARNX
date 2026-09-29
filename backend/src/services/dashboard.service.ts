import { prisma } from '../prisma/client';

export class DashboardService {
  async getOverview() {
    try {
      const [
        totalTrainees,
        activeSessions,
        completedSessions,
        passedAssessments,
        certificatesIssued,
        fireSessions,
        gasSessions,
        totalSessions,
      ] = await Promise.all([
        prisma.trainee.count(),
        prisma.trainingSession.count({
          where: { status: { in: ['STARTED', 'IN_PROGRESS'] } },
        }),
        prisma.trainingSession.count({
          where: { status: 'COMPLETED' },
        }),
        prisma.assessment.count({
          where: { passed: true },
        }),
        prisma.certificate.count({
          where: { status: 'PASSED' },
        }),
        prisma.trainingSession.count({
          where: { module: 'FIRE' },
        }),
        prisma.trainingSession.count({
          where: { module: 'GAS' },
        }),
        prisma.trainingSession.count(),
      ]);

      const completionRate =
        totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

      return {
        totalTrainees,
        activeSessions,
        completedSessions,
        passedAssessments,
        certificatesIssued,
        fireSessions,
        gasSessions,
        completionRate,
      };
    } catch (err: any) {
      console.error('[PostgreSQL ERROR] Failed to fetch dashboard overview:', err?.message || err);
      throw new Error(`Database error fetching overview: ${err?.message || 'Unknown error'}`);
    }
  }

  async getTrainingTrend() {
    try {
      const days = 14;
      const now = new Date();
      const trendData: Array<{
        date: string;
        label: string;
        fire: number;
        gas: number;
        total: number;
      }> = [];

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        const label = `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;

        const start = new Date(d);
        start.setHours(0, 0, 0, 0);
        const end = new Date(d);
        end.setHours(23, 59, 59, 999);

        const [fireCount, gasCount] = await Promise.all([
          prisma.trainingSession.count({
            where: {
              module: 'FIRE',
              startedAt: { gte: start, lte: end },
            },
          }),
          prisma.trainingSession.count({
            where: {
              module: 'GAS',
              startedAt: { gte: start, lte: end },
            },
          }),
        ]);

        trendData.push({
          date: dateStr,
          label,
          fire: fireCount,
          gas: gasCount,
          total: fireCount + gasCount,
        });
      }

      return trendData;
    } catch (err: any) {
      console.error('[PostgreSQL ERROR] Failed to fetch training trend:', err?.message || err);
      throw new Error(`Database error fetching training trend: ${err?.message || 'Unknown error'}`);
    }
  }

  async getRecentSessions(limit: number = 10) {
    try {
      return await prisma.trainingSession.findMany({
        include: {
          trainee: true,
          certificate: true,
          events: {
            orderBy: { timestamp: 'desc' },
            take: 3,
          },
        },
        orderBy: { startedAt: 'desc' },
        take: limit,
      });
    } catch (err: any) {
      console.error('[PostgreSQL ERROR] Failed to fetch recent sessions:', err?.message || err);
      throw new Error(`Database error fetching recent sessions: ${err?.message || 'Unknown error'}`);
    }
  }

  async getModuleStats() {
    const modules = [
      { id: 'M-01', key: 'FIRE', name: 'Fire & Explosion', category: 'Emergency response' },
      { id: 'M-02', key: 'GAS', name: 'Gas & Confined Space', category: 'Environmental safety' },
    ];

    try {
      const results = await Promise.all(
        modules.map(async (m) => {
          const [totalSessions, completedSessions, passedAssessments, traineesCount] =
            await Promise.all([
              prisma.trainingSession.count({ where: { module: m.key } }),
              prisma.trainingSession.count({ where: { module: m.key, status: 'COMPLETED' } }),
              prisma.assessment.count({ where: { module: m.key, passed: true } }),
              prisma.trainingSession
                .findMany({
                  where: { module: m.key },
                  select: { traineeId: true },
                  distinct: ['traineeId'],
                })
                .then((res) => res.length),
            ]);

          const completion =
            totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
          const passRate =
            totalSessions > 0 ? Math.round((passedAssessments / totalSessions) * 100) : 0;

          return {
            id: m.id,
            name: m.name,
            category: m.category,
            key: m.key,
            trainees: traineesCount,
            sessions: totalSessions,
            completedSessions,
            completion,
            passRate,
            status: 'Active',
          };
        })
      );

      return results;
    } catch (err: any) {
      console.error('[PostgreSQL ERROR] Failed to fetch module stats:', err?.message || err);
      throw new Error(`Database error fetching module stats: ${err?.message || 'Unknown error'}`);
    }
  }

  async getLanguageStats() {
    const languages = [
      { code: 'en', name: 'English' },
      { code: 'hi', name: 'Hindi' },
      { code: 'sat', name: 'Santali' },
    ];

    try {
      const stats = await Promise.all(
        languages.map(async (lang) => {
          const [trainees, sessions] = await Promise.all([
            prisma.trainee.count({ where: { language: lang.code } }),
            prisma.trainingSession.count({
              where: { trainee: { language: lang.code } },
            }),
          ]);

          return {
            code: lang.code,
            name: lang.name,
            trainees,
            sessions,
          };
        })
      );

      return stats;
    } catch (err: any) {
      console.error('[PostgreSQL ERROR] Failed to fetch language stats:', err?.message || err);
      throw new Error(`Database error fetching language stats: ${err?.message || 'Unknown error'}`);
    }
  }
}

export const dashboardService = new DashboardService();
