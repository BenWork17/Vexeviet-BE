import type Redis from 'ioredis';
import { createRedisClient } from '@vexeviet/common';

const RECONNECT_COOLDOWN_MS = 5000;

class RouteRedisClient {
  private client: Redis;
  private isConnected = false;
  private connectPromise: Promise<void> | null = null;
  private nextReconnectAt = 0;

  constructor() {
    this.client = createRedisClient({ serviceName: 'route-service', maxRetriesPerRequest: 1 });
    this.client.on('connect', () => {
      this.isConnected = true;
    });
    this.client.on('close', () => {
      this.isConnected = false;
    });
  }

  getClient(): Redis {
    return this.client;
  }

  async connect(): Promise<void> {
    if (this.isConnected || this.client.status === 'ready') {
      this.isConnected = true;
      return;
    }

    if (Date.now() < this.nextReconnectAt) {
      return;
    }

    if (!this.connectPromise) {
      this.connectPromise = this.client
        .connect()
        .then(() => {
          this.isConnected = true;
        })
        .catch(() => {
          this.isConnected = false;
          this.nextReconnectAt = Date.now() + RECONNECT_COOLDOWN_MS;
        })
        .finally(() => {
          this.connectPromise = null;
        });
    }

    await this.connectPromise;
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    this.isConnected = false;
  }

  isReady(): boolean {
    return this.isConnected && this.client.status === 'ready';
  }
}

export const redisClient = new RouteRedisClient();
export const redis = redisClient.getClient();
