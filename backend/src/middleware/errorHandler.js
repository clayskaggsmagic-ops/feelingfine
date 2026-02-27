/**
 * Production Error Handler — OWASP 2025 compliant.
 * - Returns only generic messages to clients (no stack traces or internal details).
 * - Logs full errors server-side with structured JSON logging.
 */
export function errorHandler(err, req, res, _next) {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';
    const isProduction = process.env.NODE_ENV === 'production';

    // Structured server-side log (always full details)
    console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status,
        message,
        stack: err.stack,
        userId: req.user?.uid || null,
        ip: req.ip,
        userAgent: req.get('user-agent'),
    }));

    // Client response — generic in production, detailed in dev
    if (isProduction) {
        const safeMessages = {
            400: 'Bad request.',
            401: 'Authentication required.',
            403: 'Access denied.',
            404: 'Resource not found.',
            429: 'Too many requests. Please try again later.',
        };
        res.status(status).json({
            error: safeMessages[status] || 'Something went wrong. Please try again.',
        });
    } else {
        res.status(status).json({
            error: message,
            stack: err.stack,
        });
    }
}
