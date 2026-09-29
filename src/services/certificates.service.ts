import { prisma, isDatabaseConnected } from '../prisma/client';
import { memoryStore } from './store';

export class CertificatesService {
  async issueCertificate(data: {
    certificateId?: string;
    sessionId: string;
    traineeId: string;
    module: string;
    score: number;
    percentage: number;
    status: string;
  }) {
    if (!data.sessionId || !data.traineeId || !data.module) {
      throw new Error('sessionId, traineeId, and module are required');
    }

    let certId = data.certificateId;
    if (!certId) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const rand = Math.floor(100000 + Math.random() * 900000);
      certId = `SAFEX-${yyyy}${mm}${dd}-${rand}`;
    }

    const normModule = data.module.toUpperCase().includes('FIRE') ? 'FIRE' : 'GAS';
    const normStatus = data.status ? data.status.toUpperCase() : 'PASSED';
    const scoreVal = Number(data.score) || 100;
    const percVal = Number(data.percentage) || 100;

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
            },
          });
        }

        const certificate = await prisma.certificate.upsert({
          where: { certificateId: certId },
          update: {
            score: scoreVal,
            percentage: percVal,
            status: normStatus,
          },
          create: {
            certificateId: certId,
            sessionId: data.sessionId,
            traineeId: data.traineeId,
            module: normModule,
            score: scoreVal,
            percentage: percVal,
            status: normStatus,
          },
          include: {
            trainee: true,
          },
        });

        try {
          await prisma.trainingSession.update({
            where: { sessionId: data.sessionId },
            data: {
              certificateId: certId,
              status: 'COMPLETED',
              assessmentPassed: true,
            },
          });
        } catch {}

        memoryStore.upsertCertificate({
          certificateId: certId,
          sessionId: data.sessionId,
          traineeId: data.traineeId,
          module: normModule,
          score: scoreVal,
          percentage: percVal,
          status: normStatus,
        });

        memoryStore.updateSession(data.sessionId, {
          certificateId: certId,
          status: 'COMPLETED',
          assessmentPassed: true,
        });

        return certificate;
      } catch {}
    }

    const cert = memoryStore.upsertCertificate({
      certificateId: certId,
      sessionId: data.sessionId,
      traineeId: data.traineeId,
      module: normModule,
      score: scoreVal,
      percentage: percVal,
      status: normStatus,
    });

    memoryStore.updateSession(data.sessionId, {
      certificateId: certId,
      status: 'COMPLETED',
      assessmentPassed: true,
    });

    return {
      ...cert,
      trainee: memoryStore.trainees.find((t) => t.traineeId === data.traineeId),
    };
  }

  async getCertificates() {
    if (isDatabaseConnected()) {
      try {
        return await prisma.certificate.findMany({
          include: {
            trainee: true,
            sessions: true,
          },
          orderBy: { issuedAt: 'desc' },
        });
      } catch {}
    }

    return memoryStore.certificates.map((c) => ({
      ...c,
      trainee: memoryStore.trainees.find((t) => t.traineeId === c.traineeId),
      sessions: memoryStore.sessions.filter((s) => s.certificateId === c.certificateId),
    }));
  }

  async getCertificateById(certificateId: string) {
    if (isDatabaseConnected()) {
      try {
        const cert = await prisma.certificate.findUnique({
          where: { certificateId },
          include: {
            trainee: true,
            sessions: {
              include: {
                assessments: true,
                events: {
                  orderBy: { timestamp: 'asc' },
                },
              },
            },
          },
        });

        if (cert) {
          return {
            certificateId: cert.certificateId,
            traineeId: cert.traineeId,
            traineeName: cert.trainee?.name || 'Unknown',
            language: cert.trainee?.language || 'sat',
            module: cert.module,
            moduleName: cert.module === 'FIRE' ? 'Fire & Explosion' : 'Gas & Confined Space',
            score: cert.score,
            percentage: cert.percentage,
            status: cert.status,
            issuedAt: cert.issuedAt,
            verified: cert.status === 'PASSED',
            verificationDetails: {
              issuer: 'SAFEX Industrial Safety Command Center',
              complianceStandard: 'ISO 45001 / OSHA 1910 Mining & Hazardous Safety',
              qrVerificationCode: cert.certificateId,
              issuedDateFormatted: cert.issuedAt.toISOString().split('T')[0],
            },
          };
        }
      } catch {}
    }

    const c = memoryStore.certificates.find((x) => x.certificateId === certificateId);
    if (!c) {
      throw new Error(`Certificate not found with ID: ${certificateId}`);
    }

    const trainee = memoryStore.trainees.find((t) => t.traineeId === c.traineeId);

    return {
      certificateId: c.certificateId,
      traineeId: c.traineeId,
      traineeName: trainee?.name || 'Asha Soren',
      language: trainee?.language || 'sat',
      module: c.module,
      moduleName: c.module === 'FIRE' ? 'Fire & Explosion' : 'Gas & Confined Space',
      score: c.score,
      percentage: c.percentage,
      status: c.status,
      issuedAt: c.issuedAt,
      verified: c.status === 'PASSED',
      verificationDetails: {
        issuer: 'SAFEX Industrial Safety Command Center',
        complianceStandard: 'ISO 45001 / OSHA 1910 Mining & Hazardous Safety',
        qrVerificationCode: c.certificateId,
        issuedDateFormatted: c.issuedAt.split('T')[0],
      },
    };
  }
}

export const certificatesService = new CertificatesService();
