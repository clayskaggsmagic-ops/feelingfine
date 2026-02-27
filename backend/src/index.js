import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler.js';

// Initialize Firebase Admin (side-effect: connects to project)
import './services/firebase.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

// Security headers
app.use(helmet());

// CORS — allow configured origins (supports both , and ; delimiters)
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(/[,;]/)
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        // Allow requests with no origin (curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        console.warn(`[cors] Blocked request from origin: ${origin}`);
        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Request logging — combined format in production for full audit trail
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check (no auth required)
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        project: process.env.FIREBASE_PROJECT_ID || 'feelingfine-b4106',
    });
});

// Rate limiters — DISABLED for development (TODO: re-enable for production)
// import { globalLimiter, authLimiter, apiLimiter, aiLimiter, trackingLimiter } from './middleware/rateLimit.js';
import { sanitizeBody } from './middleware/validate.js';
// app.use(globalLimiter);
app.use(sanitizeBody);

// API v1 routes
import authRoutes from './routes/auth.js';
app.use('/v1/auth', authRoutes);

import contentRoutes from './routes/content.js';
import trackingRoutes from './routes/tracking.js';
app.use('/v1/content', contentRoutes);
app.use('/v1/tracking', trackingRoutes);

import surveyRoutes from './routes/surveys.js';
app.use('/v1/surveys', surveyRoutes);
import aiRoutes from './routes/ai.js';
app.use('/v1/ai', aiRoutes);
import adminRoutes from './routes/admin.js';
app.use('/v1/admin', adminRoutes);
import communityRoutes from './routes/community.js';
app.use('/v1/community', communityRoutes);

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// Initialize daily email cron job
import { initDailyEmailJob } from './jobs/dailyEmailJob.js';

app.listen(PORT, () => {
    console.log(`\n  Feeling Fine API`);
    console.log(`  ────────────────────────`);
    console.log(`  Port:        ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  CORS:        ${allowedOrigins.join(', ')}`);
    console.log(`  Health:      http://localhost:${PORT}/health\n`);

    // Start cron jobs after server is ready
    initDailyEmailJob();
});

export default app;
