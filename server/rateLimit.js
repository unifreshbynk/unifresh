const buckets = new Map();

/**
 * Limite simple par IP + route.
 * @param {string} key
 * @param {number} max
 * @param {number} windowMs
 */
export function checkRateLimit(key, max = 5, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  if (bucket.count > max) {
    const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
    return { allowed: false, retryAfterSec };
  }
  return { allowed: true };
}

export function rateLimitMiddleware(routeKey, max, windowMs) {
  return (req, res, next) => {
    const ip =
      String(req.headers["x-forwarded-for"] || "")
        .split(",")[0]
        .trim() || req.socket?.remoteAddress || "unknown";
    const key = `${routeKey}:${ip}`;
    const result = checkRateLimit(key, max, windowMs);
    if (!result.allowed) {
      return res.status(429).json({
        error: `Trop de tentatives. Réessayez dans ${result.retryAfterSec} secondes.`,
      });
    }
    next();
  };
}
