import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Express, Request, Response } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import morgan from 'morgan';
import { env } from './config/env';
import { morganStream } from './config/logger';
import './config/passport';
import { errorHandler } from './middlewares/error.middleware';
import { notFoundHandler } from './middlewares/notFound.middleware';
import { generalLimiter } from './middlewares/rateLimiter.middleware';
import { passport } from './config/passport';
import routes from './routes';

export const createApp = (): Express => {
  const app = express();

  // Required for correct client IPs / secure cookies when running behind a
  // reverse proxy (nginx, load balancer, etc.) - enable via TRUST_PROXY=true.
  if (env.TRUST_PROXY) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  );
  app.use(hpp());
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));
  app.use(cookieParser());
  app.use(morgan(env.isDevelopment ? 'dev' : 'combined', { stream: morganStream }));

  // Stateless JWT auth - no express-session required.
  app.use(passport.initialize());

  app.use('/api', generalLimiter, routes);

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
