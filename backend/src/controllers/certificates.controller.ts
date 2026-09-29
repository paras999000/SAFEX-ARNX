import { Request, Response, NextFunction } from 'express';
import { certificatesService } from '../services/certificates.service';

export class CertificatesController {
  async issue(req: Request, res: Response, next: NextFunction) {
    try {
      const { certificateId, sessionId, traineeId, module, score, percentage, status } = req.body;

      const certificate = await certificatesService.issueCertificate({
        certificateId,
        sessionId,
        traineeId,
        module,
        score,
        percentage,
        status,
      });

      res.status(201).json({
        success: true,
        data: certificate,
      });
    } catch (err: any) {
      console.error('[CertificatesController.issue Error]', err?.message || err);
      const isValidationError = err.message && err.message.includes('required');
      res.status(isValidationError ? 400 : 500).json({
        success: false,
        message: err.message || 'Failed to issue certificate in PostgreSQL',
      });
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const certificates = await certificatesService.getCertificates();
      res.status(200).json({
        success: true,
        data: certificates,
      });
    } catch (err: any) {
      console.error('[CertificatesController.getAll Error]', err?.message || err);
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch certificates from PostgreSQL',
      });
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { certificateId } = req.params;
      const certificate = await certificatesService.getCertificateById(certificateId);

      res.status(200).json({
        success: true,
        data: certificate,
      });
    } catch (err: any) {
      console.error('[CertificatesController.getById Error]', err?.message || err);
      const isNotFound = err.message && err.message.includes('not found');
      res.status(isNotFound ? 404 : 500).json({
        success: false,
        message: err.message || 'Certificate not found in PostgreSQL',
      });
    }
  }
}

export const certificatesController = new CertificatesController();
