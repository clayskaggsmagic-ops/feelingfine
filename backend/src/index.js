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

// CORS — allow configured origins
const allowedOrigins = (process.env.CORS_ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map(o => o.trim());

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

// Request logging
app.use(morgan('dev'));

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

// API v1 routes
import authRoutes from './routes/auth.js';
app.use('/v1/auth', authRoutes);

// Future routes (added in subsequent prompts)
import contentRoutes from './routes/content.js';
import trackingRoutes from './routes/tracking.js';
app.use('/v1/content', contentRoutes);
app.use('/v1/tracking', trackingRoutes);

// app.use('/v1/surveys', surveyRoutes);
// app.use('/v1/ai', aiRoutes);
// app.use('/v1/admin', adminRoutes);

// ---------------------------------------------------------------------------
// Error handling
// ---------------------------------------------------------------------------

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
    console.log(`\n  Feeling Fine API`);
    console.log(`  ────────────────────────`);
    console.log(`  Port:        ${PORT}`);
    console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`  CORS:        ${allowedOrigins.join(', ')}`);
    console.log(`  Health:      http://localhost:${PORT}/health\n`);
});

export default app;
