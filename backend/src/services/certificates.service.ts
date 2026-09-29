import { prisma } from '../prisma/client';

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

    let certId = data.certificateId ? String(data.certificateId).trim() : '';
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
      } catch (sessErr: any) {
        console.warn(`[CertificatesService] Notice: Session ${data.sessionId} update skipped:`, sessErr?.message);
      }

      console.log(`[PostgreSQL] Certificate issued & persisted: ${certId}`);
      return certificate;
    } catch (err: any) {
      console.error(`[PostgreSQL ERROR] Failed to issue certificate ${certId}:`, err?.message || err);
      throw new Error(`Database error issuing certificate: ${err?.message || 'Unknown error'}`);
    }
  }

  async getCertificates() {
    try {
      return await prisma.certificate.findMany({
        include: {
          trainee: true,
          sessions: true,
        },
        orderBy: { issuedAt: 'desc' },
      });
    } catch (err: any) {
      console.error('[PostgreSQL ERROR] Failed to fetch certificates:', err?.message || err);
      throw new Error(`Database error fetching certificates: ${err?.message || 'Unknown error'}`);
    }
  }

  async getCertificateById(certificateId: string) {
    const certId = String(certificateId).trim();
    try {
      const cert = await prisma.certificate.findUnique({
        where: { certificateId: certId },
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

      if (!cert) {
        throw new Error(`Certificate not found with ID: ${certId}`);
      }

      return {
        certificateId: cert.certificateId,
        traineeId: cert.traineeId,
        traineeName: cert.trainee?.name || 'Trainee',
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
          issuedDateFormatted: cert.issuedAt instanceof Date ? cert.issuedAt.toISOString().split('T')[0] : String(cert.issuedAt).split('T')[0],
        },
      };
    } catch (err: any) {
      console.error(`[PostgreSQL ERROR] Failed to get certificate ${certId}:`, err?.message || err);
      throw err;
    }
  }
}

export const certificatesService = new CertificatesService();
