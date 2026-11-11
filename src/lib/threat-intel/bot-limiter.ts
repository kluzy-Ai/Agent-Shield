/**
 * Bot-Friendly Rate Limiter for Public Threat Intelligence API
 * Enforces per-IP / client sliding window rate limits with standard HTTP headers:
 * - X-RateLimit-Limit
 * - X-RateLimit-Remaining
 * - X-RateLimit-Reset
 * - Retry-After
 */

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const botLimitMap = new Map<string, RateLimitBucket>();

export function checkBotRateLimit(
  clientIdentifier: string,
  maxRequests = 60,
  windowMs = 60 * 1000
): {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetSeconds: number;
} {
  const now = Date.now();
  const bucket = botLimitMap.get(clientIdentifier);

  if (!bucket || now > bucket.resetAt) {
    botLimitMap.set(clientIdentifier, {
      count: 1,
      resetAt: now + windowMs
    });
    return {
      allowed: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      resetSeconds: Math.ceil(windowMs / 1000)
    };
  }

  if (bucket.count >= maxRequests) {
    const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetSeconds
    };
  }

  bucket.count++;
  const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - bucket.count,
    resetSeconds
  };
}

export function resetBotRateLimitsForTesting(): void {
  botLimitMap.clear();
}
