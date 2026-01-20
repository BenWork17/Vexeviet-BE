import crypto from 'crypto';
import { redis } from '../config/redis';

const DEFAULT_TTL = 300; // 5 minutes

export class CacheService {
  private prefix: string;

  constructor(prefix: string = 'vexeviet') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  generateCacheKey(params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          acc[key] = params[key];
        }
        return acc;
      }, {} as Record<string, unknown>);

    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(sortedParams))
      .digest('hex');

    return hash;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const fullKey = this.getKey(key);
      const data = await redis.get(fullKey);
      if (!data) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      await redis.set(fullKey, JSON.stringify(value), 'EX', ttl);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const fullKey = this.getKey(key);
      await redis.del(fullKey);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const fullPattern = this.getKey(pattern);
      const keys = await redis.keys(fullPattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache deletePattern error:', error);
    }
  }

  async invalidateSearchCache(): Promise<void> {
    await this.deletePattern('search:*');
  }
}

export const cacheService = new CacheService();
