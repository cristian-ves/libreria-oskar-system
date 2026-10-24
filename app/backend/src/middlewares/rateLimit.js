const createRateLimit = ({
  max = 10,
  windowMs = 15 * 60 * 1000,
  now = Date.now,
  cleanupIntervalMs = Math.max(1000, Math.min(windowMs, 60 * 1000)),
  scheduleCleanup = true,
} = {}) => {
  const attempts = new Map();
  const cleanupExpired = () => {
    const time = now();
    for (const [ip, record] of attempts) {
      if (time >= record.resetAt) attempts.delete(ip);
    }
  };

  const cleanupTimer = scheduleCleanup ? setInterval(cleanupExpired, cleanupIntervalMs) : null;
  cleanupTimer?.unref();

  const middleware = (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const time = now();
    let entry = attempts.get(key);
    if (!entry || time >= entry.resetAt) {
      entry = { count: 0, resetAt: time + windowMs };
      attempts.set(key, entry);
    }
    if (entry.count >= max) {
      return res.status(429).json({ status: 'fail', message: 'Demasiados intentos. Inténtalo de nuevo más tarde.' });
    }
    entry.count += 1;
    return next();
  };
  middleware.reset = () => attempts.clear();
  middleware.cleanup = cleanupExpired;
  middleware.close = () => { if (cleanupTimer) clearInterval(cleanupTimer); };
  middleware.store = attempts;
  return middleware;
};

const env = require('../config/env');
const limiter = createRateLimit({ max: env.loginRateLimit, windowMs: env.loginRateWindowMs });
limiter.createRateLimit = createRateLimit;
module.exports = limiter;
