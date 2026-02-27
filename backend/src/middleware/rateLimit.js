/**
 * Rate Limiter Middleware — OWASP 2025 compliant.
 * Uses in-memory store (suitable for single-instance deployments).
 * For multi-instance, swap to Redis-backed store.
 */

const store = new Map();

// Clean expired entries every 60s
const CLEANUP_INTERVAL = 60_000;
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
        if (now > entry.resetTime) store.delete(key);
    }
}, CLEANUP_INTERVAL);

/**
 * Create a rate limiter middleware.
 * @param {object} opts
 * @param {number} opts.windowMs - Time window in ms (default 15 min)
 * @param {number} opts.max - Max requests per window (default 100)
 * @param {string} opts.keyPrefix - Prefix for store keys (default 'global')
 * @param {boolean} opts.perUser - If true, rate limit per user UID instead of per IP
 */
export function rateLimit({ windowMs = 15 * 60_000, max = 100, keyPrefix = 'global', perUser = false } = {}) {
    return (req, res, next) => {
        const identifier = perUser && req.user?.uid
            ? req.user.uid
            : (req.ip || req.connection.remoteAddress);
        const key = `${keyPrefix}:${identifier}`;
        const now = Date.now();
        let entry = store.get(key);

        if (!entry || now > entry.resetTime) {
            entry = { count: 0, resetTime: now + windowMs };
            store.set(key, entry);
        }

        entry.count++;

        const remaining = Math.max(0, max - entry.count);
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));
        res.setHeader('Retry-After', Math.ceil((entry.resetTime - now) / 1000));

        if (entry.count > max) {
            return res.status(429).json({
                error: 'Too many requests. Please try again later.',
                retryAfter: Math.ceil((entry.resetTime - now) / 1000),
            });
        }

        next();
    };
}

/* ── Pre-configured limiters per OWASP 2025 ── */

// Global: 100 req / 15 min per IP
export const globalLimiter = rateLimit({ windowMs: 15 * 60_000, max: 100, keyPrefix: 'global' });

// Auth routes: 10 req / 15 min (brute-force protection)
export const authLimiter = rateLimit({ windowMs: 15 * 60_000, max: 10, keyPrefix: 'auth' });

// AI routes: 20 req / 15 min per user (Gemini cost protection)
export const aiLimiter = rateLimit({ windowMs: 15 * 60_000, max: 20, keyPrefix: 'ai', perUser: true });

// Tracking writes: 60 req / 15 min per user
export const trackingLimiter = rateLimit({ windowMs: 15 * 60_000, max: 60, keyPrefix: 'tracking', perUser: true });

// Standard API limiter: 60 req / 15 min per IP
export const apiLimiter = rateLimit({ windowMs: 15 * 60_000, max: 60, keyPrefix: 'api' });
