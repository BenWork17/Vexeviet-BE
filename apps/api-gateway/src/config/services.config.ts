import { config } from '@vexeviet/config';

export interface ServiceConfig {
  name: string;
  url: string;
  prefix: string;
  healthCheck?: string;
}

export const services: ServiceConfig[] = [
  {
    name: 'user-service',
    url: config.services.userOrigin,
    prefix: '/users',
    healthCheck: '/health',
  },
  {
    name: 'user-service-auth',
    url: config.services.userOrigin,
    prefix: '/auth',
  },
  {
    name: 'user-service-bus-templates',
    url: config.services.userOrigin,
    prefix: '/bus-templates',
  },
  {
    name: 'user-service-uploads',
    url: config.services.userOrigin,
    prefix: '/uploads',
  },
  {
    name: 'user-service-audit-logs',
    url: config.services.userOrigin,
    prefix: '/audit-logs',
  },
  {
    name: 'route-service',
    url: config.services.routeOrigin,
    prefix: '/routes',
    healthCheck: '/health',
  },
  {
    name: 'route-service-search',
    url: config.services.routeOrigin,
    prefix: '/search',
  },
  {
    name: 'booking-service',
    url: config.services.bookingOrigin,
    prefix: '/bookings',
    healthCheck: '/health',
  },
  {
    name: 'booking-service-seats',
    url: config.services.bookingOrigin,
    prefix: '/seats',
  },
  {
    name: 'booking-service-reviews',
    url: config.services.bookingOrigin,
    prefix: '/reviews',
  },
  {
    name: 'payment-service',
    url: config.services.paymentOrigin,
    prefix: '/payments',
    healthCheck: '/health',
  },
  {
    name: 'payment-service-webhooks',
    url: config.services.paymentOrigin,
    prefix: '/webhooks',
  },
];

export const getServiceByPrefix = (prefix: string): ServiceConfig | undefined => {
  return services.find((service) => prefix.startsWith(service.prefix));
};
