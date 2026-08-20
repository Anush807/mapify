import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import { configurePassport } from './lib/passport';
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
      // Already parsed and validated into an array by config/env.ts.
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  // Stateless: Passport only resolves the Google profile; sessions are our JWT.
  app.use(configurePassport().initialize());

  // Rate limiters key off the client IP, which is the proxy's without this.
  app.set('trust proxy', 1);

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, provider: env.AI_PROVIDER });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/roadmaps', roadmapRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
