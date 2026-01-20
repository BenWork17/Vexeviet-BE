import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class RedisClient {
  private client: Redis | null = null;
  private isConnected = false;

  getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 3,
        retryStrategy(times: number): number {
          const delay = Math.min(times * 50, 2000);
          return delay;
        },
        lazyConnect: true,
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        console.log('✅ Redis connected');
      });

      this.client.on('error', (err: Error) => {
        console.error('❌ Redis error:', err.message);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        this.isConnected = false;
        console.log('⚠️ Redis connection closed');
      });
    }

    return this.client;
  }

  async connect(): Promise<void> {
    const client = this.getClient();
    if (!this.isConnected) {
      await client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  isReady(): boolean {
    return this.isConnected;
  }
}

export const redisClient = new RedisClient();
export const redis = redisClient.getClient();
