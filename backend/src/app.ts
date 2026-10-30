import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { ENV } from './config/env.js';
import authRoutes from './routes/auth.routes.js';
import complaintRoutes from './routes/complaint.routes.js';
import { requireAuth } from './middleware/auth.middleware.js';
import { requireRole } from './middleware/role.middleware.js';
import { ROLES } from './constants/enums.js';
import { errorHandler } from './middleware/error.middleware.js';
import { sendError, sendSuccess } from './utils/response.util.js';

const app: Express = express();

// Security & Parsing Middleware
app.use(
  cors({
    origin: ENV.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  sendSuccess(res, 'CampusFix backend service is operational', {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: ENV.NODE_ENV,
  });
});

// Route Mounts
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);

// Test Helper Routes (Available only in test environment)
if (ENV.NODE_ENV === 'test') {
  app.get(
    '/api/test/admin-only',
    requireAuth,
    requireRole(ROLES.ADMIN),
    (_req: Request, res: Response) => {
      sendSuccess(res, 'Admin portal access granted', { authorized: true });
    }
  );
}

// 404 Fallback
app.use((req: Request, res: Response) => {
  sendError(
    res,
    `Route ${req.method} ${req.originalUrl} not found`,
    'NOT_FOUND',
    404
  );
});

// Centralized Error Handler
app.use(errorHandler);

export default app;
