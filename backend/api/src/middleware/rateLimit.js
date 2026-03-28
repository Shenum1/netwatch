/**
 * Simple in-memory rate limiter.
 * For production, swap with redis-based rate limiting (ioredis + sliding window).
 *
 * Usage:
 *   app.use('/api/events/ingest', rateLimit({ windowMs: 60000, max: 100 }))
 */

const store = new Map(); // ip -> { count, resetAt }

export function rateLimit({ windowMs = 60_000, max = 100, message } = {}) {
  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    entry.count++;
    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", retryAfter);
      return res.status(429).json({
        error: message || `Too many requests — retry after ${retryAfter}s`,
        retryAfter,
      });
    }
    next();
  };
}

/**
 * Stricter limiter for auth endpoints — prevents brute force.
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60_000,  // 15 minutes
  max: 20,
  message: "Too many login attempts — try again in 15 minutes",
});

/**
 * Ingest limiter — prevents event flooding.
 */
export const ingestRateLimit = rateLimit({
  windowMs: 60_000,       // 1 minute
  max: 200,
  message: "Ingest rate limit exceeded",
});

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of store.entries()) {
    if (now > entry.resetAt) store.delete(ip);
  }
}, 5 * 60_000);
