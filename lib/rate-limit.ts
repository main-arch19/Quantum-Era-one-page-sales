/**
 * In-memory fixed-window rate limiter.
 *
 * Known limit: on serverless this is per-instance, not global, so a determined
 * attacker spread across cold starts gets more than the stated budget. It is
 * sized for paid-traffic volume, where the realistic threat is a bot hammering
 * one endpoint from one IP — which this does stop. Move to Redis if the page
 * ever takes meaningful abuse.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Drop expired buckets so the map cannot grow without bound. */
function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export type RateLimitResult = {
  allowed: boolean;
  /** Seconds until the window resets. Surfaced in the error message. */
  retryAfterSeconds: number;
};

export function checkRateLimit(key: string): RateLimitResult {
  const now = Date.now();

  // Cheap amortised cleanup — this map only ever holds a handful of entries.
  if (buckets.size > 500) sweep(now);

  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  existing.count += 1;

  if (existing.count > MAX_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test seam — the rate limit test in verification needs a clean slate. */
export function resetRateLimits(): void {
  buckets.clear();
}
