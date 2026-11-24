import express, { Application } from 'express';
import cors from 'cors';
import {
  createCorrelationMiddleware,
  createHttpLogger,
  createLogger,
} from '@vexeviet/common';
import { config } from './config';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export const logger = createLogger('booking-service');

export function createBookingApp(): Application {
  const app: Application = express();

  app.use(cors());
  app.use(createCorrelationMiddleware('booking-service'));
  app.use(createHttpLogger('booking-service'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: config.service.name,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
