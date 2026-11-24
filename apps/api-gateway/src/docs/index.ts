import swaggerJsdoc from 'swagger-jsdoc';
import { openApiComponents } from './components.openapi';
import { authAndUserPaths } from './auth-users.openapi';
import { routePaths } from './routes.openapi';
import { bookingAndSeatPaths } from './bookings-seats.openapi';
import { paymentPaths } from './payments.openapi';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'VeXeViet API',
      version: '1.0.0',
      description: 'Vietnamese Bus Ticket Booking Platform — Unified Microservices API Gateway',
      contact: {
        name: 'VeXeViet Team',
        email: 'support@vexeviet.vn',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server (API Gateway)',
      },
    ],
    components: openApiComponents,
    tags: [
      { name: 'Health', description: 'Health check endpoints' },
      { name: 'Auth', description: 'Authentication endpoints' },
      { name: 'Users', description: 'User profile & operator media management' },
      { name: 'Bus Templates', description: 'Bus layout templates' },
      { name: 'Routes', description: 'Route management' },
      { name: 'Search', description: 'Route search' },
      { name: 'Seats', description: 'Seat availability & holding' },
      { name: 'Bookings', description: 'Booking lifecycle management' },
      { name: 'Payments', description: 'Payment processing & reconciliation' },
      { name: 'Webhooks', description: 'External payment webhooks (VNPay)' },
      { name: 'Admin', description: 'Admin & operator console endpoints' },
      { name: 'Audit Logs', description: 'Shared admin audit trail' },
    ],
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'API Gateway health check',
          responses: {
            200: { description: 'Service is healthy' },
          },
        },
      },
      ...authAndUserPaths,
      ...routePaths,
      ...bookingAndSeatPaths,
      ...paymentPaths,
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options) as Record<string, unknown>;
