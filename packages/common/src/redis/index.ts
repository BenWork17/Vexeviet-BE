import Redis, { RedisOptions } from 'ioredis';
import { config } from '@vexeviet/config';
import { createLogger } from '../logger';

export interface SharedRedisOptions extends RedisOptions {
  serviceName?: string;
}

export function createRedisClient(options: SharedRedisOptions = {}): Redis {
  const { serviceName = 'redis', ...redisOpts } = options;
  const logger = createLogger(serviceName);

  const client = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: config.redis.password || undefined,
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 2,
    retryStrategy: (times): number | null => {
      if (times > 5) return null;
      return Math.min(times * 200, 2000);
    },
    ...redisOpts,
  });

  client.on('error', (err) => {
    logger.warn(`Redis client warning: ${err.message}`);
  });

  return client;
}
