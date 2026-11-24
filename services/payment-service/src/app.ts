import express, { Express } from 'express';
import cors from 'cors';
import {
  createCorrelationMiddleware,
  createHttpLogger,
  createLogger,
} from '@vexeviet/common';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export const logger = createLogger('payment-service');

export function createPaymentApp(): Express {
  const app = express();

  app.set('trust proxy', true);
  app.use(cors());
  app.use(createCorrelationMiddleware('payment-service'));
  app.use(createHttpLogger('payment-service'));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'payment-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get('/ready', (_req, res) => {
    res.json({
      status: 'ready',
      service: 'payment-service',
    });
  });

  app.use('/api/v1', routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
