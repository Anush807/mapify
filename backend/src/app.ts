import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import authRoutes from './routes/auth.routes';
import roadmapRoutes from './routes/roadmap.routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { env } from './config/env';

export function createApp() {
  const app = express();

  // credentials:true is what lets the httpOnly auth cookie cross from the
  // Vite dev server on :5173 to the API on :3000.
  app.use(
    cors({
      origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, provider: env.AI_PROVIDER });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/roadmaps', roadmapRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
