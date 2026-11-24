import { createLogger, createRedisClient } from '@vexeviet/common';
import { paymentConfig } from '../config';
import { IdempotencyRecord, PaymentResponse } from '../types';

const logger = createLogger('payment-service:idempotency');
const redis = createRedisClient({ serviceName: 'payment-service' });

const IDEMPOTENCY_PREFIX = 'idempotency:payment:';

export async function getIdempotencyRecord(key: string): Promise<IdempotencyRecord | null> {
  try {
    const data = await redis.get(`${IDEMPOTENCY_PREFIX}${key}`);
    if (!data) return null;
    return JSON.parse(data) as IdempotencyRecord;
  } catch (error) {
    logger.warn('Failed to read idempotency record', {
      error: error instanceof Error ? error.message : String(error),
    });
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
    logger.warn('Failed to store idempotency record', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function deleteIdempotencyRecord(key: string): Promise<void> {
  try {
    await redis.del(`${IDEMPOTENCY_PREFIX}${key}`);
  } catch (error) {
    logger.warn('Failed to delete idempotency record', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function connectRedis(): Promise<void> {
  try {
    await redis.connect();
    logger.info('Redis connected for payment idempotency');
  } catch (error) {
    logger.warn('Redis unavailable; continuing without Redis idempotency cache', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
}

export { redis };
