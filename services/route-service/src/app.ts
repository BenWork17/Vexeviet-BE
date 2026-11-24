import express, { Application } from 'express';
import cors from 'cors';
import {
  createCorrelationMiddleware,
  createHttpLogger,
  createLogger,
} from '@vexeviet/common';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export const logger = createLogger('route-service');

export function createRouteApp(): Application {
  const app: Application = express();

  app.use(cors());
  app.use(createCorrelationMiddleware('route-service'));
  app.use(createHttpLogger('route-service'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'route-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
