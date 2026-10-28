import type { Express } from 'express';

/**
 * Resolve the gateway's `trust proxy` setting from `TRUST_PROXY_HOPS`.
 *
 * The limiter keys on `req.ip`. With trust off, every client behind a reverse
 * proxy shares the proxy's single bucket; with trust *fully* on, any client can
 * forge `X-Forwarded-For` and rotate its own bucket at will. So the only value
 * accepted is a hop count — the number of proxies in front of the gateway whose
 * `X-Forwarded-For` entries may be believed. Express turns a number into the
 * predicate `index < hops`, which keeps all hops before the trusted boundary
 * attacker-controlled and therefore untrusted.
 *
 * Values:
 * - absent / empty / `0` / `false` / `off` → off (today's behaviour, the default)
 * - `1`..`MAX_TRUSTED_HOPS`                → trust that many proxy hops
 * - anything else                          → throws, so the process refuses to start
 *
 * Invalid input throws rather than falling back to off: the ceilings are now low
 * enough that a silently-off typo behind a real proxy would give the whole site a
 * shared bucket (e.g. 5 registrations/minute for *all* users), and silently
 * trusting everything would defeat the limiter. Refusing to boot is loud and
 * cannot enable trust by accident. `true` is deliberately not accepted: it is
 * exactly the forgeable setting this guard exists to prevent.
 */
export const MAX_TRUSTED_HOPS = 10;

export type TrustProxySetting = false | number;

export interface TrustProxyResolution {
  /** Effective value handed to `app.set('trust proxy', ...)`. */
  setting: TrustProxySetting;
  /** Raw env value, for logging/diagnostics. Never contains secrets. */
  rawValue: string | undefined;
  /** Human-readable reason, safe to log. */
  reason: string;
}

export class InvalidTrustProxyValueError extends Error {
  constructor(rawValue: string) {
    super(
      `Invalid TRUST_PROXY_HOPS="${rawValue}". Use 0/false/off (trust no proxy), ` +
        `or a hop count from 1 to ${MAX_TRUSTED_HOPS} (number of trusted proxies). ` +
        'Refusing to start so proxy trust is never enabled by accident.'
    );
    this.name = 'InvalidTrustProxyValueError';
  }
}

export const resolveTrustProxy = (
  rawValue: string | undefined = process.env.TRUST_PROXY_HOPS
): TrustProxyResolution => {
  if (rawValue === undefined || rawValue.trim() === '') {
    return {
      setting: false,
      rawValue,
      reason: 'TRUST_PROXY_HOPS is unset — trust proxy disabled (default)',
    };
  }

  const value = rawValue.trim().toLowerCase();

  if (value === '0' || value === 'false' || value === 'off') {
    return {
      setting: false,
      rawValue,
      reason: `TRUST_PROXY_HOPS="${rawValue}" — trust proxy disabled`,
    };
  }

  // Only a bare positive integer is a hop count. Rejects negatives, decimals,
  // whitespace inside the number, booleans and any other text.
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new InvalidTrustProxyValueError(rawValue);
  }

  const hops = Number(value);

  if (hops > MAX_TRUSTED_HOPS) {
    throw new InvalidTrustProxyValueError(rawValue);
  }

  return {
    setting: hops,
    rawValue,
    reason: `TRUST_PROXY_HOPS="${rawValue}" — trusting ${hops} proxy hop(s)`,
  };
};

/**
 * Apply the resolved setting to the app. Must run before any middleware that
 * reads `req.ip` (the rate limiter and the request logger both do).
 */
export const applyTrustProxy = (app: Express): TrustProxyResolution => {
  const resolution = resolveTrustProxy();
  app.set('trust proxy', resolution.setting);
  return resolution;
};
