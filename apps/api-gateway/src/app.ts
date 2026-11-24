import express, { Express } from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import swaggerUi from 'swagger-ui-express';
import {
  API_PREFIX,
  REQUEST_ID_HEADER,
  createCorrelationMiddleware,
  createErrorHandler,
  createHttpLogger,
  createLogger,
  getRequestId,
  notFoundHandler,
} from '@vexeviet/common';
import { services } from './config/services.config';
import { applyTrustProxy } from './config/trust-proxy.config';
import { swaggerSpec } from './config/swagger.config';
import { rateLimiter } from './middlewares/rate-limiter.middleware';

export const logger = createLogger('api-gateway');

export function createGatewayApp(): Express {
  const app = express();

  const trustProxy = applyTrustProxy(app);
  logger.info(`Trust proxy configured: ${trustProxy.reason}`);

  app.use(
    cors({
      exposedHeaders: ['X-Request-Id'],
    })
  );
  app.use(createCorrelationMiddleware('api-gateway'));
  app.use(createHttpLogger('api-gateway'));

  const authRateLimiter = rateLimiter(100, 60000);
  app.use((req, res, next) => {
    if (req.path === `${API_PREFIX}/auth` || req.path.startsWith(`${API_PREFIX}/auth/`)) {
      authRateLimiter(req, res, next);
      return;
    }
    next();
  });

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  const swaggerSetup = swaggerUi.setup(swaggerSpec as object, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'VeXeViet API Documentation',
  });
  app.use(
    '/api/docs',
    swaggerUi.serve as unknown as express.RequestHandler,
    swaggerSetup as unknown as express.RequestHandler
  );

  app.get('/api/docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  app.get('/services', (_req, res) => {
    res.json({
      success: true,
      services: services.map((s) => ({
        name: s.name,
        prefix: `${API_PREFIX}${s.prefix}`,
        healthCheck: s.healthCheck ? `${s.url}${s.healthCheck}` : undefined,
      })),
    });
  });

  services.forEach((service) => {
    const proxyPath = `${API_PREFIX}${service.prefix}`;

    app.use(
      proxyPath,
      createProxyMiddleware({
        target: service.url,
        changeOrigin: true,
        timeout: 30000,
        proxyTimeout: 30000,
        logLevel: 'silent',
        onProxyReq: (proxyReq, req) => {
          const reqId = (req.headers[REQUEST_ID_HEADER] as string) || getRequestId();
          proxyReq.setHeader('X-Request-Id', reqId);
          proxyReq.setHeader('X-Forwarded-By', 'VeXeViet-Gateway');
        },
        onError: (err, req, res) => {
          const reqId = (req.headers[REQUEST_ID_HEADER] as string) || getRequestId();
          logger.error(`Upstream service unavailable: ${service.name} (${err.message})`);
          (res as express.Response).status(503).json({
            success: false,
            error: {
              code: 'SERVICE_UNAVAILABLE',
              message: `Service ${service.name} is unavailable`,
            },
            requestId: reqId,
          });
        },
      })
    );
  });

  app.use(notFoundHandler);
  app.use(createErrorHandler('api-gateway'));

  return app;
}
