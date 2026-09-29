import { Request, Response, NextFunction } from 'express';

export function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const configuredKey = process.env.ADMIN_API_KEY;

  // If no API key configured, pass through (e.g. dev mode)
  if (!configuredKey) {
    return next();
  }

  const providedKey = req.headers['x-safex-api-key'] || req.query.api_key;

  // Allow read operations from the admin dashboard without blocking,
  // but if provided or if writing from Unity, validate it
  if (providedKey && providedKey !== configuredKey) {
    return res.status(401).json({
      success: false,
      message: 'Invalid X-SAFEX-API-KEY provided',
    });
  }

  next();
}
