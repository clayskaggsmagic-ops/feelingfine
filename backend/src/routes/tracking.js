import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { db } from '../services/firebase.js';
import { getDateKey, calculateProgramDay, getFocusedCornerstone } from '../services/programService.js';

const router = Router();

// All tracking routes require authentication
router.use(requireAuth);

/**
 * Get or create today's tracking document for the user.
 */
async function getOrCreateTrackingDoc(uid) {
    const dateKey = getDateKey();
    const ref = db.collection('users').doc(uid).collection('tracking').doc(dateKey);
    const doc = await ref.get();

    if (doc.exists) {
        return { ref, data: { dateKey, ...doc.data() }, created: false };
    }

    const newDoc = {
        dateKey,
        feelingScore: null,
        completedDos: [],
        completedCustomDos: [],
        cornerstoneProgress: {
            nutrition: 0,
            movement: 0,
            sleep: 0,
            stress_management: 0,
            social_connection: 0,
            cognitive_health: 0,
            healthy_aging: 0,
        },
        dailyDoseViewed: false,
        dailyDoseViewedAt: null,
        surveyCompleted: null,
        createdAt: new Date().toISOString(),
    };

    await ref.set(newDoc);
    console.log(`[tracking] Created new tracking doc for uid: ${uid}, date: ${dateKey}`);
    return { ref, data: { dateKey, ...newDoc }, created: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/tracking/today — Today's tracking data
// ─────────────────────────────────────────────────────────────────────────────
router.get('/today', async (req, res, next) => {
    try {
        const { data } = await getOrCreateTrackingDoc(req.user.uid);
        const programDay = calculateProgramDay(req.userProfile);
        const focusedCornerstone = getFocusedCornerstone(programDay);

        console.log(`[tracking/today] Returning tracking for uid: ${req.user.uid}, date: ${data.dateKey}`);

        res.json({ tracking: data, programDay, focusedCornerstone });
    } catch (err) {
        console.error('[tracking/today] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/tracking/history?days=30 — Historical tracking data
// ─────────────────────────────────────────────────────────────────────────────
router.get('/history', async (req, res, next) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 90);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startKey = getDateKey(startDate);

        console.log(`[tracking/history] Fetching ${days} days for uid: ${req.user.uid}, from: ${startKey}`);

        const snapshot = await db.collection('users').doc(req.user.uid)
            .collection('tracking')
            .where('dateKey', '>=', startKey)
            .orderBy('dateKey', 'desc')
            .get();

        const history = snapshot.docs.map(d => ({ dateKey: d.id, ...d.data() }));
        console.log(`[tracking/history] Found ${history.length} tracking days`);

        res.json({ history, days });
    } catch (err) {
        console.error('[tracking/history] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/tracking/feeling-score — Submit today's feeling score (1-10)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/feeling-score', async (req, res, next) => {
    try {
        const { score } = req.body;

        if (typeof score !== 'number' || score < 1 || score > 10) {
            return res.status(400).json({ error: 'score must be a number between 1 and 10' });
        }

        const { ref, data } = await getOrCreateTrackingDoc(req.user.uid);
        await ref.update({ feelingScore: score });

        console.log(`[tracking/feeling-score] uid: ${req.user.uid}, score: ${score}`);

        res.json({ tracking: { ...data, feelingScore: score } });
    } catch (err) {
        console.error('[tracking/feeling-score] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/tracking/complete-do — Mark a Daily Do as completed
// ─────────────────────────────────────────────────────────────────────────────
router.post('/complete-do', async (req, res, next) => {
    try {
        const { doId, category } = req.body;

        if (!doId) {
            return res.status(400).json({ error: 'doId is required' });
        }

        const { ref, data } = await getOrCreateTrackingDoc(req.user.uid);

        // Check if already completed
        const alreadyDone = data.completedDos.some(d => d.doId === doId);
        if (alreadyDone) {
            console.log(`[tracking/complete-do] Already completed: ${doId}`);
            return res.json({ tracking: data, alreadyCompleted: true });
        }

        // Add to completed list
        const completedDos = [...data.completedDos, { doId, completedAt: new Date().toISOString() }];

        // Update cornerstone progress
        const cornerstoneProgress = { ...data.cornerstoneProgress };
        if (category && cornerstoneProgress[category] !== undefined) {
            cornerstoneProgress[category] += 1;
        }

        await ref.update({ completedDos, cornerstoneProgress });

        console.log(`[tracking/complete-do] uid: ${req.user.uid}, doId: ${doId}, category: ${category || 'none'}`);

        res.json({ tracking: { ...data, completedDos, cornerstoneProgress } });
    } catch (err) {
        console.error('[tracking/complete-do] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/tracking/uncomplete-do — Unmark a Daily Do
// ─────────────────────────────────────────────────────────────────────────────
router.post('/uncomplete-do', async (req, res, next) => {
    try {
        const { doId, category } = req.body;

        if (!doId) {
            return res.status(400).json({ error: 'doId is required' });
        }

        const { ref, data } = await getOrCreateTrackingDoc(req.user.uid);

        const completedDos = data.completedDos.filter(d => d.doId !== doId);

        // Decrement cornerstone progress
        const cornerstoneProgress = { ...data.cornerstoneProgress };
        if (category && cornerstoneProgress[category] !== undefined && cornerstoneProgress[category] > 0) {
            cornerstoneProgress[category] -= 1;
        }

        await ref.update({ completedDos, cornerstoneProgress });

        console.log(`[tracking/uncomplete-do] uid: ${req.user.uid}, doId: ${doId}`);

        res.json({ tracking: { ...data, completedDos, cornerstoneProgress } });
    } catch (err) {
        console.error('[tracking/uncomplete-do] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/tracking/custom-do — Add and complete a custom do
// ─────────────────────────────────────────────────────────────────────────────
router.post('/custom-do', async (req, res, next) => {
    try {
        const { text, category } = req.body;

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            return res.status(400).json({ error: 'text is required' });
        }

        const { ref, data } = await getOrCreateTrackingDoc(req.user.uid);

        const customDo = {
            text: text.trim(),
            category: category || 'general',
            completedAt: new Date().toISOString(),
        };

        const completedCustomDos = [...data.completedCustomDos, customDo];

        // Update cornerstone progress if valid category
        const cornerstoneProgress = { ...data.cornerstoneProgress };
        if (category && cornerstoneProgress[category] !== undefined) {
            cornerstoneProgress[category] += 1;
        }

        await ref.update({ completedCustomDos, cornerstoneProgress });

        console.log(`[tracking/custom-do] uid: ${req.user.uid}, text: "${text}", category: ${category || 'general'}`);

        res.json({ tracking: { ...data, completedCustomDos, cornerstoneProgress } });
    } catch (err) {
        console.error('[tracking/custom-do] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/tracking/report — Aggregated trends and report data
// ─────────────────────────────────────────────────────────────────────────────
router.get('/report', async (req, res, next) => {
    try {
        const days = Math.min(parseInt(req.query.days) || 30, 90);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        const startKey = getDateKey(startDate);

        const snapshot = await db.collection('users').doc(req.user.uid)
            .collection('tracking')
            .where('dateKey', '>=', startKey)
            .orderBy('dateKey', 'asc')
            .get();

        const history = snapshot.docs.map(d => ({ dateKey: d.id, ...d.data() }));

        // Calculate aggregated stats
        const totalDosCompleted = history.reduce((sum, day) =>
            sum + (day.completedDos?.length || 0) + (day.completedCustomDos?.length || 0), 0);

        const feelingScores = history.filter(d => d.feelingScore != null).map(d => d.feelingScore);
        const avgFeelingScore = feelingScores.length > 0
            ? (feelingScores.reduce((a, b) => a + b, 0) / feelingScores.length).toFixed(1)
            : null;

        // Trend: compare last 7 days vs previous 7 days
        const last7 = history.filter(d => {
            const diff = (new Date() - new Date(d.dateKey)) / (1000 * 60 * 60 * 24);
            return diff <= 7;
        });
        const prev7 = history.filter(d => {
            const diff = (new Date() - new Date(d.dateKey)) / (1000 * 60 * 60 * 24);
            return diff > 7 && diff <= 14;
        });

        const last7Dos = last7.reduce((s, d) => s + (d.completedDos?.length || 0) + (d.completedCustomDos?.length || 0), 0);
        const prev7Dos = prev7.reduce((s, d) => s + (d.completedDos?.length || 0) + (d.completedCustomDos?.length || 0), 0);

        const trend = prev7Dos > 0
            ? Math.round(((last7Dos - prev7Dos) / prev7Dos) * 100)
            : null;

        // Cornerstone totals
        const cornerstoneTotals = {
            nutrition: 0, movement: 0, sleep: 0, stress_management: 0,
            social_connection: 0, cognitive_health: 0, healthy_aging: 0,
        };
        history.forEach(day => {
            if (day.cornerstoneProgress) {
                for (const [key, val] of Object.entries(day.cornerstoneProgress)) {
                    if (cornerstoneTotals[key] !== undefined) cornerstoneTotals[key] += val;
                }
            }
        });

        // Daily breakdown for charts
        const dailyBreakdown = history.map(day => ({
            dateKey: day.dateKey,
            dosCompleted: (day.completedDos?.length || 0) + (day.completedCustomDos?.length || 0),
            feelingScore: day.feelingScore,
        }));

        console.log(`[tracking/report] uid: ${req.user.uid}, days: ${days}, totalDos: ${totalDosCompleted}, avgScore: ${avgFeelingScore}`);

        res.json({
            days,
            totalDosCompleted,
            avgFeelingScore: avgFeelingScore ? parseFloat(avgFeelingScore) : null,
            trend,
            cornerstoneTotals,
            dailyBreakdown,
            feelingScores: history.map(d => ({ dateKey: d.dateKey, score: d.feelingScore })),
            activeDays: history.length,
        });
    } catch (err) {
        console.error('[tracking/report] Error:', err.message);
        next(err);
    }
});

export default router;
