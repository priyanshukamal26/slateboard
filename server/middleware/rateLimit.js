/**
 * Manual sliding-window rate limiter — no external packages.
 * Covers Unit III (Express middleware) + security requirements.
 */

const windows = new Map(); // ip -> { count, windowStart }

const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_HITS = 100;

function rateLimit(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();

  let entry = windows.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    entry = { count: 1, windowStart: now };
    windows.set(ip, entry);
    return next();
  }

  entry.count += 1;

  if (entry.count > MAX_HITS) {
    const retryAfter = Math.ceil((entry.windowStart + WINDOW_MS - now) / 1000);
    res.setHeader("Retry-After", retryAfter);
    return res.status(429).json({
      message: `Too many requests. Try again in ${retryAfter}s.`,
    });
  }

  next();
}

// Cleanup stale entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [ip, entry] of windows.entries()) {
      if (now - entry.windowStart > WINDOW_MS * 2) {
        windows.delete(ip);
      }
    }
  },
  5 * 60 * 1000
);

module.exports = { rateLimit };
