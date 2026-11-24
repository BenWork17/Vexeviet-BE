import type Redis from 'ioredis';
import { createRedisClient } from '@vexeviet/common';

class UserRedisWrapper {
  private client: Redis;

  constructor() {
    this.client = createRedisClient({
      serviceName: 'user-service',
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'vexeviet:',
    });
  }

  public getClient(): Redis {
    return this.client;
  }

  public async set(key: string, value: string, ttl?: number): Promise<void> {
    if (ttl) {
      await this.client.setex(key, ttl, value);
    } else {
      await this.client.set(key, value);
    }
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  public async disconnect(): Promise<void> {
    await this.client.quit();
  }
}

export const redis = new UserRedisWrapper();
export const redisClient = redis.getClient();
