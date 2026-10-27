import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const RECONNECT_COOLDOWN_MS = 5000;

class RedisClient {
  private client: Redis | null = null;
  private isConnected = false;
  private connectPromise: Promise<void> | null = null;
  private nextReconnectAt = 0;

  getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(REDIS_URL, {
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
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

    if (this.isConnected || client.status === 'ready') {
      this.isConnected = true;
      return;
    }

    if (Date.now() < this.nextReconnectAt) {
      return;
    }

    if (!this.connectPromise) {
      this.connectPromise = client
        .connect()
        .then(() => {
          this.isConnected = true;
        })
        .catch((error: Error) => {
          this.isConnected = false;
          this.nextReconnectAt = Date.now() + RECONNECT_COOLDOWN_MS;
          console.error('Redis connect error:', error.message);
        })
        .finally(() => {
          this.connectPromise = null;
        });
    }

    await this.connectPromise;
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
    }
  }

  isReady(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }
}

export const redisClient = new RedisClient();
export const redis = redisClient.getClient();
