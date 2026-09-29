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
      res.status(400).json({
        success: false,
        message: err.message || 'Failed to issue certificate',
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
      res.status(500).json({
        success: false,
        message: err.message || 'Failed to fetch certificates',
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
      res.status(404).json({
        success: false,
        message: err.message || 'Certificate not found',
      });
    }
  }
}

export const certificatesController = new CertificatesController();
