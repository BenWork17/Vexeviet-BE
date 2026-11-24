import express, { Express } from 'express';
import cors from 'cors';
import {
  createCorrelationMiddleware,
  createHttpLogger,
  createLogger,
} from '@vexeviet/common';
import routes from './routes';
import { getUploadDir } from './utils/image-upload';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export const logger = createLogger('user-service');

export function createUserApp(): Express {
  const app = express();

  app.use(cors());
  app.use(createCorrelationMiddleware('user-service'));
  app.use(createHttpLogger('user-service'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'user-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.use(
    '/api/v1/uploads',
    express.static(getUploadDir(), {
      index: false,
      dotfiles: 'deny',
      maxAge: '7d',
      setHeaders: (res) => {
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    })
  );

  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
