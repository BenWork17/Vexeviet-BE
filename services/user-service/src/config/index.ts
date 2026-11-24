import { config } from '@vexeviet/config';

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
  port: config.ports.user,
  env: config.nodeEnv,
  apiVersion: 'v1',
  jwtSecret: config.jwt.secret,
  jwtAccessExpiry: config.jwt.accessExpiry,
  jwtRefreshExpiry: config.jwt.refreshExpiry,
  corsOrigins: [...config.corsOrigins],
};

export * from './redis';
