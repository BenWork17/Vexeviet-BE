import Redis from 'ioredis';
import { paymentConfig } from '../config';
import { IdempotencyRecord, PaymentResponse } from '../types';

const redis = new Redis({
  host: paymentConfig.redis.host,
  port: paymentConfig.redis.port,
  lazyConnect: true,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

const IDEMPOTENCY_PREFIX = 'idempotency:payment:';

export async function getIdempotencyRecord(key: string): Promise<IdempotencyRecord | null> {
  try {
    const data = await redis.get(`${IDEMPOTENCY_PREFIX}${key}`);
    if (!data) return null;
    return JSON.parse(data) as IdempotencyRecord;
  } catch (error) {
    console.error('Error getting idempotency record:', error);
    return null;
  }
}

export async function setIdempotencyRecord(
  key: string,
  paymentId: string,
  response: PaymentResponse
): Promise<void> {
  try {
    const record: IdempotencyRecord = {
      key,
      paymentId,
      response,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + paymentConfig.idempotency.ttlSeconds * 1000),
    };
    
    await redis.setex(
      `${IDEMPOTENCY_PREFIX}${key}`,
      paymentConfig.idempotency.ttlSeconds,
      JSON.stringify(record)
    );
  } catch (error) {
    console.error('Error setting idempotency record:', error);
  }
}

export async function deleteIdempotencyRecord(key: string): Promise<void> {
  try {
    await redis.del(`${IDEMPOTENCY_PREFIX}${key}`);
  } catch (error) {
    console.error('Error deleting idempotency record:', error);
  }
}

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    console.log('✅ Redis connected for idempotency');
  } catch (error) {
    console.warn('⚠️ Redis connection failed, idempotency will be disabled:', error);
  }
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}

export { redis };
