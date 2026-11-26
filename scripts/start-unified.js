#!/usr/bin/env node
/**
 * Unified Single-Process Production Entrypoint
 *
 * Boots all 4 backend microservices on loopback ports (3001..3004) and the
 * public API Gateway on 0.0.0.0:$PORT inside ONE Node.js process (~150MB RAM).
 * Ideal for free-tier cloud containers (e.g. Render 512MB RAM) to eliminate
 * multi-service cold-start cascades while preserving microservice boundaries.
 */

process.env.USER_SERVICE_PORT = process.env.USER_SERVICE_PORT || '3001';
process.env.ROUTE_SERVICE_PORT = process.env.ROUTE_SERVICE_PORT || '3002';
process.env.BOOKING_SERVICE_PORT = process.env.BOOKING_SERVICE_PORT || '3003';
process.env.PAYMENT_SERVICE_PORT = process.env.PAYMENT_SERVICE_PORT || '3004';

process.env.USER_SERVICE_URL =
  process.env.USER_SERVICE_URL || `http://127.0.0.1:${process.env.USER_SERVICE_PORT}`;
process.env.ROUTE_SERVICE_URL =
  process.env.ROUTE_SERVICE_URL || `http://127.0.0.1:${process.env.ROUTE_SERVICE_PORT}`;
process.env.BOOKING_SERVICE_URL =
  process.env.BOOKING_SERVICE_URL || `http://127.0.0.1:${process.env.BOOKING_SERVICE_PORT}`;
process.env.PAYMENT_SERVICE_URL =
  process.env.PAYMENT_SERVICE_URL || `http://127.0.0.1:${process.env.PAYMENT_SERVICE_PORT}`;

console.log('[unified] Starting VeXeViet backend services in single-process mode...');

require('../services/user-service/dist/index.js');
require('../services/route-service/dist/index.js');
require('../services/booking-service/dist/index.js');
require('../services/payment-service/dist/index.js');
require('../apps/api-gateway/dist/index.js');

// Pre-warm Prisma TLS socket to Cloud DB immediately on startup so the first
// user login/query does not pay cold connection handshake latency.
setImmediate(() => {
  try {
    const { prisma } = require('../packages/database/dist/index.js');
    if (prisma && typeof prisma.$queryRawUnsafe === 'function') {
      prisma
        .$queryRawUnsafe('SELECT 1')
        .then(() => console.log('[unified] Database TLS connection pool pre-warmed.'))
        .catch(() => {});
    }
  } catch {
    // Ignore pre-warm errors
  }
});

const shutdown = async (signal) => {
  console.log(`[unified] Received ${signal}, shutting down gracefully...`);
  try {
    const { prisma } = require('../packages/database/dist/index.js');
    if (prisma && typeof prisma.$disconnect === 'function') {
      await prisma.$disconnect();
    }
  } catch {
    // Ignore disconnect errors on exit
  }
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
