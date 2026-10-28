import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import swaggerUi from 'swagger-ui-express';
import { config } from '@vexeviet/config';
import { API_PREFIX } from '@vexeviet/common';
import { services } from './config/services.config';
import { applyTrustProxy } from './config/trust-proxy.config';
import { swaggerSpec } from './config/swagger.config';
import { requestLogger } from './middlewares/logger.middleware';
import { rateLimiter } from './middlewares/rate-limiter.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app = express();

// `trust proxy` must be set before any middleware reads `req.ip` (the rate
// limiter and request logger both do). It is driven by TRUST_PROXY_HOPS and
// defaults to off — see config/trust-proxy.config.ts for the accepted values.
const trustProxy = applyTrustProxy(app);
console.log(`🔒 Trust proxy: ${trustProxy.reason}`);

// Middlewares
app.use(cors());
app.use(requestLogger);

// Rate limiting for the credential endpoints only.
// Mounted at the app root behind an explicit prefix filter (rather than at `${API_PREFIX}/auth`)
// so `req.path` stays the full `/api/v1/auth/...` and keeps matching the exact-string keys in
// `rateLimitConfigs` — an Express mount point would strip the prefix and no key could ever match.
// /health, /api/docs, /api/docs.json, /services and every proxy mount bypass this entirely.
// NOTE: the limiter keys on `req.ip`. Set TRUST_PROXY_HOPS to the number of reverse proxies in
// front of this gateway so the real client IP is used; leave it unset (the default) when there
// is no proxy, or every client will share a single bucket.
const authRateLimiter = rateLimiter(100, 60000); // 100 requests per minute for non-listed auth paths
app.use((req, res, next) => {
  if (req.path === `${API_PREFIX}/auth` || req.path.startsWith(`${API_PREFIX}/auth/`)) {
    authRateLimiter(req, res, next);
    return;
  }
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Swagger API Documentation
const swaggerSetup = swaggerUi.setup(swaggerSpec as object, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'VeXeViet API Documentation',
});
app.use('/api/docs', swaggerUi.serve as unknown as express.RequestHandler, swaggerSetup as unknown as express.RequestHandler);

// OpenAPI spec JSON endpoint
app.get('/api/docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Service discovery endpoint
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

// Dynamic proxy routing
services.forEach((service) => {
  const proxyPath = `${API_PREFIX}${service.prefix}`;
  
  console.log(`📍 Routing ${proxyPath} -> ${service.url}`);
  
  app.use(
    proxyPath,
    createProxyMiddleware({
      target: service.url,
      changeOrigin: true,
      timeout: 30000, // 30 seconds
      proxyTimeout: 30000,
      onProxyReq: (proxyReq, req) => {
        proxyReq.setHeader('X-Forwarded-By', 'VeXeViet-Gateway');
        console.log(`[PROXY] ${req.method} ${req.originalUrl} -> ${service.url}`);
      },
      onProxyRes: (proxyRes, req) => {
        console.log(`[PROXY] ${req.method} ${req.originalUrl} <- ${proxyRes.statusCode}`);
      },
      onError: (err, _req, res) => {
        console.error(`[PROXY ERROR] ${service.name}:`, err.message);
        (res as express.Response).status(503).json({
          success: false,
          error: `Service ${service.name} is unavailable`,
          service: service.name,
        });
      },
    })
  );
});

// Error handlers (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = config.port || 3000;

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  console.log(`📚 API Docs: http://localhost:${PORT}/api/docs`);
  console.log(`📡 Services: http://localhost:${PORT}/services`);
  console.log('\n🔀 Registered routes:');
  services.forEach((s) => {
    console.log(`  ${API_PREFIX}${s.prefix} -> ${s.url}`);
  });
});
