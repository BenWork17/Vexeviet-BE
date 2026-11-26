import { PrismaClient } from '@prisma/client';

const TRANSIENT_ERROR_CODES = new Set(['P1001', 'P1002', 'P1008', 'P1017']);
const TRANSIENT_ERROR_PATTERNS = [
  'Server has closed the connection',
  'Connection terminated',
  'Connection reset by peer',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  "Can't reach database server",
  'Socket timeout',
];

export function buildPooledDatabaseUrl(rawUrl = process.env.DATABASE_URL): string | undefined {
  if (!rawUrl || !rawUrl.trim()) {
    return undefined;
  }

  try {
    const parsed = new URL(rawUrl.trim());
    if (!parsed.searchParams.has('connection_limit')) {
      parsed.searchParams.set('connection_limit', process.env.DB_CONNECTION_LIMIT || '20');
    }
    if (!parsed.searchParams.has('pool_timeout')) {
      parsed.searchParams.set('pool_timeout', process.env.DB_POOL_TIMEOUT || '30');
    }
    if (!parsed.searchParams.has('connect_timeout')) {
      parsed.searchParams.set('connect_timeout', process.env.DB_CONNECT_TIMEOUT || '15');
    }
    return parsed.toString();
  } catch {
    return rawUrl;
  }
}

function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const code = (error as { code?: unknown }).code;
  if (typeof code === 'string' && TRANSIENT_ERROR_CODES.has(code)) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return TRANSIENT_ERROR_PATTERNS.some((pattern) => message.includes(pattern));
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

const prismaClientSingleton = (): PrismaClient => {
  const pooledUrl = buildPooledDatabaseUrl();
  const client = new PrismaClient({
    ...(pooledUrl ? { datasources: { db: { url: pooledUrl } } } : {}),
    log: process.env.DEBUG_SQL === 'true' ? ['query', 'error', 'warn'] : ['error', 'warn'],
  });

  client.$use(async (params, next): Promise<unknown> => {
    try {
      return (await next(params)) as unknown;
    } catch (error) {
      if (params.runInTransaction || !isTransientDbError(error)) {
        throw error;
      }
      await sleep(80);
      return (await next(params)) as unknown;
    }
  });

  return client;
};

declare global {
  // eslint-disable-next-line no-var
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
  // eslint-disable-next-line no-var
  var __prismaKeepAliveStarted: boolean | undefined;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

globalThis.prisma = prisma;

if (process.env.NODE_ENV === 'production' && !globalThis.__prismaKeepAliveStarted) {
  globalThis.__prismaKeepAliveStarted = true;
  const timer = setInterval(() => {
    void prisma.$queryRawUnsafe('SELECT 1').catch(() => {
      // Ignore idle ping failures; transient middleware recovers on demand
    });
  }, 240_000);
  timer.unref();
}

export { prisma };
export * from '@prisma/client';
export { Decimal } from '@prisma/client/runtime/library';
export * from './audit';
