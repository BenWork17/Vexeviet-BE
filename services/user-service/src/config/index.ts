export interface AppConfig {
  port: number;
  env: string;
  apiVersion: string;
  jwtSecret: string;
  jwtAccessExpiry: string;
  jwtRefreshExpiry: string;
  corsOrigins: string[];
}

export const appConfig: AppConfig = {
  port: parseInt(process.env.PORT || '3001'),
  env: process.env.NODE_ENV || 'development',
  apiVersion: process.env.API_VERSION || 'v1',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtAccessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
  jwtRefreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3000').split(','),
};

export * from './database';
export * from './redis';
