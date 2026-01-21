import express from 'express';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '@vexeviet/config';
import { API_PREFIX } from '@vexeviet/common';
import { services } from './config/services.config';
import { requestLogger } from './middlewares/logger.middleware';
import { rateLimiter } from './middlewares/rate-limiter.middleware';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

const app = express();

// Middlewares
app.use(cors());
app.use(requestLogger);
app.use(rateLimiter(100, 60000)); // 100 requests per minute

// Health check
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
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
  console.log(`📡 Services: http://localhost:${PORT}/services`);
  console.log('\n🔀 Registered routes:');
  services.forEach((s) => {
    console.log(`  ${API_PREFIX}${s.prefix} -> ${s.url}`);
  });
});
