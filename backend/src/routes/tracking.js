import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDateKey, calculateProgramDay, getNow } from '../services/programService.js';
import {
    getTrackingDay,
    upsertTrackingDay,
    getTrackingHistory,
    insertCompletedDo,
    deleteCompletedDo,
    insertCustomDo,
} from '../services/dataConnect.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Get or create today's tracking record
// ─────────────────────────────────────────────────────────────────────────────
async function getOrCreateTrackingDoc(uid) {
    const dateKey = getDateKey();

    let tracking = await getTrackingDay(uid, dateKey);

    if (!tracking) {
        await upsertTrackingDay(uid, dateKey);
        tracking = await getTrackingDay(uid, dateKey);
        console.log(`[tracking] Created new tracking record for uid: ${uid}, date: ${dateKey}`);
        return { data: tracking, created: true };
    }

    return { data: tracking, created: false };
}

/**
 * Normalize a tracking day record into a flat response shape.
 */
function normalizeTracking(tracking) {
    return {
        dateKey: tracking.dateKey,
        feelingScore: tracking.feelingScore,
        dailyDoseViewed: tracking.dailyDoseViewed,
        dailyDoseViewedAt: tracking.dailyDoseViewedAt,
        surveyCompleted: tracking.surveyCompleted,
        completedDos: (tracking.completedDos || []).map(d => ({
            id: d.id,
            doId: d.doId,
            category: d.category,
            completedAt: d.completedAt,
        })),
        customDos: (tracking.customDos || []).map(d => ({
            id: d.id,
            text: d.text,
            category: d.category,
            completedAt: d.completedAt,
        })),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/tracking/today — Get today's tracking data
// ─────────────────────────────────────────────────────────────────────────────
router.get('/today', requireAuth, async (req, res, next) => {
    try {
        const { data, created } = await getOrCreateTrackingDoc(req.user.uid);
        console.log(`[tracking/today] uid: ${req.user.uid}, created: ${created}`);
        res.json({ tracking: normalizeTracking(data), created });
    } catch (err) {
        console.error('[tracking/today] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/tracking/history — Get tracking history (default: 30 days)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history', requireAuth, async (req, res, next) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 90);
        const startDate = getNow();
        startDate.setDate(startDate.getDate() - days);
        const startKey = getDateKey(startDate);

        console.log(`[tracking/history] Fetching ${days} days for uid: ${req.user.uid}, from: ${startKey}`);

        const history = await getTrackingHistory(req.user.uid, startKey);
        console.log(`[tracking/history] Found ${history.length} tracking days`);

        res.json({
            history: history.map(normalizeTracking),
            days,
        });
    } catch (err) {
        console.error('[tracking/history] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/tracking/feeling-score — Record daily feeling score (1-10)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/feeling-score', requireAuth, async (req, res, next) => {
    try {
        const { score } = req.body;

        if (score === undefined || score < 1 || score > 10) {
            return res.status(400).json({ error: 'score must be between 1 and 10' });
        }

        const dateKey = getDateKey();
        await upsertTrackingDay(req.user.uid, dateKey, { feelingScore: Math.round(score) });

        const tracking = await getTrackingDay(req.user.uid, dateKey);
        console.log(`[tracking/feeling-score] uid: ${req.user.uid}, score: ${score}`);

        res.json({ tracking: normalizeTracking(tracking) });
    } catch (err) {
        console.error('[tracking/feeling-score] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/tracking/complete-do — Mark a Daily Do as completed
// ─────────────────────────────────────────────────────────────────────────────
router.post('/complete-do', requireAuth, async (req, res, next) => {
    try {
        const { doId, category } = req.body;

        if (!doId) {
            return res.status(400).json({ error: 'doId is required' });
        }

        const dateKey = getDateKey();

        // Ensure tracking day exists
        await getOrCreateTrackingDoc(req.user.uid);

        // Check if already completed
        const tracking = await getTrackingDay(req.user.uid, dateKey);
        const completedDos = tracking.completedDos || [];
        const alreadyDone = completedDos.some(d => d.doId === doId);

        if (alreadyDone) {
            console.log(`[tracking/complete-do] Already completed: ${doId}`);
            return res.json({ tracking: normalizeTracking(tracking), alreadyCompleted: true });
        }

        await insertCompletedDo(req.user.uid, dateKey, doId, category || null);
        console.log(`[tracking/complete-do] uid: ${req.user.uid}, doId: ${doId}`);

        const updated = await getTrackingDay(req.user.uid, dateKey);
        res.json({ tracking: normalizeTracking(updated) });
    } catch (err) {
        console.error('[tracking/complete-do] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/tracking/uncomplete-do — Undo a completed Daily Do
// ─────────────────────────────────────────────────────────────────────────────
router.post('/uncomplete-do', requireAuth, async (req, res, next) => {
    try {
        const { doId } = req.body;

        if (!doId) {
            return res.status(400).json({ error: 'doId is required' });
        }

        const dateKey = getDateKey();
        const tracking = await getTrackingDay(req.user.uid, dateKey);

        if (!tracking) {
            return res.status(404).json({ error: 'No tracking record for today' });
        }

        const completedDos = tracking.completedDos || [];
        const found = completedDos.find(d => d.doId === doId);

        if (!found) {
            return res.status(404).json({ error: 'Do not found in completed list' });
        }

        await deleteCompletedDo(found.id);
        console.log(`[tracking/uncomplete-do] uid: ${req.user.uid}, doId: ${doId}`);

        const updated = await getTrackingDay(req.user.uid, dateKey);
        res.json({ tracking: normalizeTracking(updated) });
    } catch (err) {
        console.error('[tracking/uncomplete-do] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/tracking/custom-do — Add a custom Do (immediately completed)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/custom-do', requireAuth, async (req, res, next) => {
    try {
        const { text, category } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: 'text is required' });
        }

        const dateKey = getDateKey();
        await getOrCreateTrackingDoc(req.user.uid);

        await insertCustomDo(req.user.uid, dateKey, text.trim(), category || 'general');
        console.log(`[tracking/custom-do] uid: ${req.user.uid}, text: "${text.trim()}"`);

        const updated = await getTrackingDay(req.user.uid, dateKey);
        res.json({ tracking: normalizeTracking(updated) });
    } catch (err) {
        console.error('[tracking/custom-do] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/tracking/report — Aggregated wellness report
// ─────────────────────────────────────────────────────────────────────────────
router.get('/report', requireAuth, async (req, res, next) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 90);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startKey = getDateKey(startDate);

        const history = await getTrackingHistory(req.user.uid, startKey);

        // Aggregate metrics
        const totalDosCompleted = history.reduce((sum, day) =>
            sum + (day.completedDos?.length || 0) + (day.customDos?.length || 0), 0);

        const scoresWithValues = history.filter(d => d.feelingScore !== null);
        const avgFeelingScore = scoresWithValues.length > 0
            ? Math.round((scoresWithValues.reduce((sum, d) => sum + d.feelingScore, 0) / scoresWithValues.length) * 10) / 10
            : null;

        // Trend: compare last 7 days avg vs previous 7 days avg
        const now = getNow();
        const last7Start = getDateKey(new Date(now.getTime() - 7 * 86400000));
        const prev7Start = getDateKey(new Date(now.getTime() - 14 * 86400000));

        const last7 = scoresWithValues.filter(d => d.dateKey >= last7Start);
        const prev7 = scoresWithValues.filter(d => d.dateKey >= prev7Start && d.dateKey < last7Start);

        const last7Avg = last7.length ? last7.reduce((s, d) => s + d.feelingScore, 0) / last7.length : null;
        const prev7Avg = prev7.length ? prev7.reduce((s, d) => s + d.feelingScore, 0) / prev7.length : null;

        let trend = 'stable';
        if (last7Avg !== null && prev7Avg !== null) {
            if (last7Avg > prev7Avg + 0.5) trend = 'improving';
            else if (last7Avg < prev7Avg - 0.5) trend = 'declining';
        }

        // Cornerstone breakdown
        const cornerstoneTotals = {};
        for (const day of history) {
            for (const d of (day.completedDos || [])) {
                if (d.category) {
                    cornerstoneTotals[d.category] = (cornerstoneTotals[d.category] || 0) + 1;
                }
            }
            for (const d of (day.customDos || [])) {
                if (d.category) {
                    cornerstoneTotals[d.category] = (cornerstoneTotals[d.category] || 0) + 1;
                }
            }
        }

        // Daily breakdown for charts
        const dailyBreakdown = history.map(day => ({
            dateKey: day.dateKey,
            feelingScore: day.feelingScore,
            dosCompleted: (day.completedDos?.length || 0) + (day.customDos?.length || 0),
        }));

        console.log(`[tracking/report] uid: ${req.user.uid}, ${days} days, ${totalDosCompleted} dos, avg: ${avgFeelingScore}`);

        res.json({
            days,
            totalDaysTracked: history.length,
            totalDosCompleted,
            avgFeelingScore,
            trend,
            cornerstoneTotals,
            dailyBreakdown,
        });
    } catch (err) {
        console.error('[tracking/report] Error:', err.message);
        next(err);
    }
});

export default router;
