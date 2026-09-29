import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { checkDatabaseConnection, isDatabaseConnected } from './prisma/client';
import { authenticateApiKey } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

import traineesRouter from './routes/trainees';
import sessionsRouter from './routes/sessions';
import eventsRouter from './routes/events';
import assessmentsRouter from './routes/assessments';
import certificatesRouter from './routes/certificates';
import dashboardRouter from './routes/dashboard';
import { seedDatabase } from './services/seed.service';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// CORS configuration for Admin Dashboard and Unity Android APK
app.use(
  cors({
    origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',').map((o) => o.trim()),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-SAFEX-API-KEY'],
  })
);

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply API Key security authentication middleware
app.use('/api', authenticateApiKey);

// Health check endpoint
app.get('/api/health', async (req: Request, res: Response) => {
  const dbStatus = await checkDatabaseConnection();
  res.status(200).json({
    success: true,
    service: 'SAFEX Safety Command Center API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: {
      type: 'PostgreSQL',
      connected: dbStatus,
      status: dbStatus ? 'HEALTHY' : 'UNREACHABLE',
    },
  });
});

// Seed endpoint for quick demo setup from dashboard or curl
app.post('/api/dashboard/seed', async (req: Request, res: Response, next) => {
  try {
    const result = await seedDatabase();
    res.status(200).json({
      success: true,
      message: 'Database seeded with demo trainees and training sessions',
      data: result,
    });
  } catch (err: any) {
    next(err);
  }
});

// Mount REST API endpoints
app.use('/api/trainees', traineesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/assessments', assessmentsRouter);
app.use('/api/certificates', certificatesRouter);
app.use('/api/dashboard', dashboardRouter);

// Serve existing admin frontend static files directly from root project folder
const frontendDir = path.resolve(__dirname, '../../');
app.use(express.static(frontendDir));

// Fallback route for single page dashboard
app.get('*', (req: Request, res: Response) => {
  // If requesting an API route that wasn't matched, return 404 JSON
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint not found: ${req.method} ${req.path}`,
    });
  }
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Global Error Handler (guarantees proper JSON output without crashing)
app.use(errorHandler);

// Start server
const server = app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`  SAFEX AR Safety Command Center Backend running!  `);
  console.log(`  Local URL:        http://localhost:${PORT}`);
  console.log(`  API Base:         http://localhost:${PORT}/api`);
  console.log(`  Health Check:     http://localhost:${PORT}/api/health`);
  console.log(`====================================================`);

  const dbConnected = await checkDatabaseConnection();
  if (dbConnected) {
    console.log(`[PostgreSQL] Connected successfully to database.`);
  } else {
    console.warn(`[PostgreSQL] Connection warning: PostgreSQL is not reachable at DATABASE_URL.`);
    console.warn(`[PostgreSQL] Make sure PostgreSQL is started and DATABASE_URL is set in .env.`);
  }
});

export default app;
