import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('[SAFEX API Error]', err);

  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error occurred';

  // Always return proper JSON response as required
  res.status(status).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
