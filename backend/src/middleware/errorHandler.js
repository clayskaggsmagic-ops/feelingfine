/**
 * Global error handler middleware.
 * Catches all unhandled errors, logs structured details, and returns a clean response.
 */
export function errorHandler(err, req, res, _next) {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal server error';

    // Structured error log
    console.error(JSON.stringify({
        level: 'error',
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        status,
        message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        userId: req.user?.uid || null,
    }));

    res.status(status).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}
