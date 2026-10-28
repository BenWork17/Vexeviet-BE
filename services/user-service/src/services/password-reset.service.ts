import { redis, redisClient } from '../config/redis';
import { CryptoUtils } from '../utils/crypto';

/**
 * Admin/user password-reset token store.
 *
 * Storage is Redis (no migration): the token is a bearer credential, so the
 * *raw* token is never persisted — the key is `password-reset:<sha256(token)>`.
 * A Redis dump therefore contains no usable reset link. Lookup re-hashes the
 * incoming token, so the same derivation is used on both sides.
 *
 * Single use is `GETDEL`: the read and the delete are one atomic Redis command,
 * so two concurrent submissions cannot both observe the record. A second
 * submit gets `null` and is treated exactly like an unknown token.
 *
 * Expiry is enforced twice for *different* reasons, not as layered defence:
 * the Redis TTL is the cleanup mechanism (nothing has to sweep dead keys), and
 * the `expiresAt` timestamp inside the value is what the request path actually
 * checks, so a clock/TTL gap can never extend a token's life.
 */

export const PASSWORD_RESET_TTL_SECONDS = 3600;

const PASSWORD_RESET_KEY_PREFIX = 'password-reset:';

export interface PasswordResetRecord {
  userId: string;
  /** ISO-8601. Compared server-side on consume. */
  expiresAt: string;
}

export interface IssuedPasswordReset {
  /** The only copy of the raw token: it goes into the email and nowhere else. */
  token: string;
  expiresAt: Date;
}

/**
 * Minimal slice of Redis the store needs. Kept injectable so the store logic can
 * be exercised without a live Redis; production always uses `redisStore`.
 */
export interface PasswordResetStore {
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  getdel(key: string): Promise<string | null>;
}

const redisStore: PasswordResetStore = {
  set: (key, value, ttlSeconds) => redis.set(key, value, ttlSeconds),
  // `redisClient` is the raw ioredis client: the wrapper's `del()` discards the
  // count, and there is no wrapper for GETDEL. ioredis applies `keyPrefix` to
  // this argument (GETDEL's first key), so write and consume keys match.
  getdel: (key) => redisClient.getdel(key),
};

/** Redis key for a raw token — never the raw token itself. */
export const buildPasswordResetKey = (token: string): string =>
  `${PASSWORD_RESET_KEY_PREFIX}${CryptoUtils.hashSHA256(token)}`;

export const serializePasswordReset = (userId: string, expiresAt: Date): string =>
  JSON.stringify({ userId, expiresAt: expiresAt.toISOString() });

/** Defensive parse: anything unexpected is treated as "no such token". */
export const parsePasswordReset = (raw: string | null): PasswordResetRecord | null => {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;

    const { userId, expiresAt } = parsed as { userId?: unknown; expiresAt?: unknown };
    if (typeof userId !== 'string' || typeof expiresAt !== 'string') return null;

    return { userId, expiresAt };
  } catch {
    return null;
  }
};

/** An unparseable timestamp counts as expired. */
export const isPasswordResetExpired = (
  record: PasswordResetRecord,
  now: Date = new Date()
): boolean => {
  const expiresAt = new Date(record.expiresAt).getTime();
  if (Number.isNaN(expiresAt)) return true;
  return expiresAt <= now.getTime();
};

export class PasswordResetService {
  private readonly store: PasswordResetStore;

  constructor(store: PasswordResetStore = redisStore) {
    this.store = store;
  }

  /**
   * Mint a token for `userId` and store only its hash. Returns the raw token for
   * the email link; callers must never log it, audit it, or return it in a body.
   */
  async issue(userId: string): Promise<IssuedPasswordReset> {
    const token = CryptoUtils.generateRandomToken(32);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_SECONDS * 1000);

    await this.store.set(
      buildPasswordResetKey(token),
      serializePasswordReset(userId, expiresAt),
      PASSWORD_RESET_TTL_SECONDS
    );

    return { token, expiresAt };
  }

  /**
   * Atomically consume a token. `null` covers unknown, already-used, expired and
   * malformed tokens alike — the caller must not distinguish them.
   */
  async consume(token: string): Promise<PasswordResetRecord | null> {
    if (!token) return null;

    const raw = await this.store.getdel(buildPasswordResetKey(token));
    const record = parsePasswordReset(raw);

    if (!record || isPasswordResetExpired(record)) return null;

    return record;
  }
}

export const passwordResetService = new PasswordResetService();
