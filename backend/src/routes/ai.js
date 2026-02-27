import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { wellnessChat, reportAnalysis } from '../services/geminiService.js';
import { getTrackingHistory } from '../services/dataConnect.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/ai/wellness-chat — Chat with wellness AI guide
// ─────────────────────────────────────────────────────────────────────────────
router.post('/wellness-chat', requireAuth, async (req, res, next) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'message is required' });
        }

        const user = req.userProfile || {};
        const uid = req.user.uid;

        // Gather context from recent tracking
        let context = {
            displayName: user.displayName || 'Friend',
            labels: user.labels || [],
        };

        try {
            const now = new Date();
            const startKey = new Date(now.getTime() - 14 * 86400000).toISOString().slice(0, 10);
            const history = await getTrackingHistory(uid, startKey);

            context.recentScores = history
                .filter(d => d.feelingScore !== null)
                .map(d => d.feelingScore)
                .slice(-7);

            context.totalDosCompleted = history.reduce(
                (sum, d) => sum + (d.completedDos?.length || 0) + (d.customDos?.length || 0), 0
            );

            const last7 = context.recentScores.slice(-7);
            const prev7 = context.recentScores.slice(0, -7);
            if (last7.length && prev7.length) {
                const l = last7.reduce((a, b) => a + b, 0) / last7.length;
                const p = prev7.reduce((a, b) => a + b, 0) / prev7.length;
                context.trend = l > p + 0.5 ? 'improving' : l < p - 0.5 ? 'declining' : 'stable';
            }
        } catch {
            // If tracking data unavailable, continue without context
        }

        console.log(`[ai/wellness-chat] uid: ${uid}, msg: "${message.slice(0, 60)}..."`);
        const reply = await wellnessChat(message.trim(), context);

        res.json({ reply });
    } catch (err) {
        console.error('[ai/wellness-chat] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/ai/report-analysis — AI summary of user's tracking data
// ─────────────────────────────────────────────────────────────────────────────
router.post('/report-analysis', requireAuth, async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const user = req.userProfile || {};

        // Fetch 30-day report data
        const now = new Date();
        const startKey = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
        const history = await getTrackingHistory(uid, startKey);

        const totalDosCompleted = history.reduce(
            (sum, d) => sum + (d.completedDos?.length || 0) + (d.customDos?.length || 0), 0
        );

        const scoresWithValues = history.filter(d => d.feelingScore !== null);
        const avgFeelingScore = scoresWithValues.length > 0
            ? Math.round((scoresWithValues.reduce((s, d) => s + d.feelingScore, 0) / scoresWithValues.length) * 10) / 10
            : null;

        const cornerstoneTotals = {};
        for (const day of history) {
            for (const d of (day.completedDos || [])) {
                if (d.category) cornerstoneTotals[d.category] = (cornerstoneTotals[d.category] || 0) + 1;
            }
        }

        const reportData = {
            totalDaysTracked: history.length,
            totalDosCompleted,
            avgFeelingScore,
            trend: 'stable',
            cornerstoneTotals,
        };

        const userContext = {
            displayName: user.displayName || 'Friend',
            labels: user.labels || [],
        };

        console.log(`[ai/report-analysis] uid: ${uid}, days: ${history.length}`);
        const analysis = await reportAnalysis(reportData, userContext);

        res.json({ analysis, reportData });
    } catch (err) {
        console.error('[ai/report-analysis] Error:', err.message);
        next(err);
    }
});

export default router;
