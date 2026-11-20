export interface ServiceConfig {
  name: string;
  url: string;
  prefix: string;
  healthCheck?: string;
}

export const services: ServiceConfig[] = [
  {
    name: 'user-service',
    url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    prefix: '/users',
    healthCheck: '/health',
  },
  {
    name: 'user-service-auth',
    url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    prefix: '/auth',
  },
  {
    name: 'route-service',
    url: process.env.ROUTE_SERVICE_URL || 'http://localhost:3002',
    prefix: '/routes',
    healthCheck: '/health',
  },
  {
    name: 'route-service-search',
    url: process.env.ROUTE_SERVICE_URL || 'http://localhost:3002',
    prefix: '/search',
  },
  // Booking Service (Iteration 1-4)
  {
    name: 'booking-service',
    url: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
    prefix: '/bookings',
    healthCheck: '/health',
  },
  {
    name: 'booking-service-seats',
    url: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
    prefix: '/seats',
  },
  {
    name: 'booking-service-reviews',
    url: process.env.BOOKING_SERVICE_URL || 'http://localhost:3003',
    prefix: '/reviews',
  },
  {
    name: 'user-service-bus-templates',
    url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    prefix: '/bus-templates',
  },
  {
    name: 'payment-service',
    url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
    prefix: '/payments',
    healthCheck: '/health',
  },
  {
    name: 'payment-service-webhooks',
    url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3004',
    prefix: '/webhooks',
  },
  {
    name: 'user-service-audit-logs',
    url: process.env.USER_SERVICE_URL || 'http://localhost:3001',
    prefix: '/audit-logs',
  },
];

export const getServiceByPrefix = (prefix: string): ServiceConfig | undefined => {
  return services.find((service) => prefix.startsWith(service.prefix));
};
