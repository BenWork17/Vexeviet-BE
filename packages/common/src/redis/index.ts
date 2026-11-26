import Redis, { RedisOptions } from 'ioredis';
import { config } from '@vexeviet/config';
import { createLogger } from '../logger';

export interface SharedRedisOptions extends RedisOptions {
  serviceName?: string;
}

export function createRedisClient(options: SharedRedisOptions = {}): Redis {
  const { serviceName = 'redis', ...redisOpts } = options;
  const logger = createLogger(serviceName);

  const baseOpts: RedisOptions = {
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 2,
    retryStrategy: (times): number | null => {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
    ...redisOpts,
  };

  const rawUrl = process.env.REDIS_URL?.trim();
  const explicitUrl =
    rawUrl && rawUrl.startsWith('redis://') && rawUrl.includes('.upstash.io')
      ? `rediss://${rawUrl.slice('redis://'.length)}`
      : rawUrl;

  const client = explicitUrl
    ? new Redis(explicitUrl, baseOpts)
    : new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password || undefined,
        ...baseOpts,
      });

  client.on('error', (err) => {
    logger.warn(`Redis client warning: ${err.message}`);
  });

  return client;
}
