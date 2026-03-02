import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { wellnessChat, reportAnalysis } from '../services/geminiService.js';
import {
    getTrackingHistory,
    getTrackingDay,
    getDoseByDayNumber,
    getDosByDayNumber,
    getUserSurveyResponses,
    listCornerstones,
} from '../services/dataConnect.js';
import { calculateProgramDay, getDateKey } from '../services/programService.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Gather full user context for AI prompts
// ─────────────────────────────────────────────────────────────────────────────
async function gatherFullContext(uid, userProfile) {
    const user = userProfile || {};
    const programDay = calculateProgramDay(user);
    const todayKey = getDateKey();

    const context = {
        displayName: user.displayName || 'Friend',
        labels: user.labels || [],
        programDay,
    };

    // Fetch all data in parallel
    const [
        todaysDose,
        yesterdaysDose,
        todaysDos,
        todayTracking,
        history,
        surveyResponses,
        cornerstones,
    ] = await Promise.all([
        programDay > 0 ? getDoseByDayNumber(programDay).catch(() => null) : null,
        programDay > 1 ? getDoseByDayNumber(programDay - 1).catch(() => null) : null,
        programDay > 0 ? getDosByDayNumber(programDay).catch(() => []) : [],
        getTrackingDay(uid, todayKey).catch(() => null),
        getTrackingHistory(uid, new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)).catch(() => []),
        getUserSurveyResponses(uid).catch(() => []),
        listCornerstones().catch(() => []),
    ]);

    // Today's daily dose
    if (todaysDose) {
        context.todaysDose = {
            title: todaysDose.title,
            category: todaysDose.category,
            message: todaysDose.message,
        };
    }

    // Yesterday's daily dose
    if (yesterdaysDose) {
        context.yesterdaysDose = {
            title: yesterdaysDose.title,
            category: yesterdaysDose.category,
            message: yesterdaysDose.message,
        };
    }

    // Today's offered tasks
    context.todaysTasks = todaysDos.map(d => ({ text: d.text, category: d.category }));

    // Today's completed tasks
    if (todayTracking) {
        context.completedToday = (todayTracking.completedDos || []).map(d => ({
            category: d.category,
            doId: d.doId,
        }));
        context.customDosToday = (todayTracking.customDos || []).map(d => ({
            text: d.text,
            category: d.category,
        }));
        context.todayFeelingScore = todayTracking.feelingScore;
        context.dailyDoseViewed = todayTracking.dailyDoseViewed;
    }

    // 14-day history
    context.recentHistory = history.map(day => ({
        date: day.dateKey,
        feelingScore: day.feelingScore,
        tasksCompleted: (day.completedDos?.length || 0) + (day.customDos?.length || 0),
        completedCategories: (day.completedDos || []).map(d => d.category).filter(Boolean),
    }));

    // Trend
    const scores = history.filter(d => d.feelingScore !== null).map(d => d.feelingScore);
    if (scores.length >= 4) {
        const half = Math.floor(scores.length / 2);
        const recent = scores.slice(0, half); // history is DESC order
        const older = scores.slice(half);
        const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
        const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
        context.trend = recentAvg > olderAvg + 0.5 ? 'improving' : recentAvg < olderAvg - 0.5 ? 'declining' : 'stable';
    }

    // Survey responses (with question text if possible)
    if (surveyResponses.length > 0) {
        context.surveyResponses = surveyResponses.map(r => {
            let answers;
            try {
                answers = typeof r.answers === 'string' ? JSON.parse(r.answers) : r.answers;
            } catch { answers = r.answers; }
            return {
                surveyId: r.surveyId,
                submittedAt: r.submittedAt,
                answers,
            };
        });
    }

    // Today's cornerstone focus
    if (cornerstones.length > 0) {
        const todayCornerstone = cornerstones.find(c => c.dayNumber === programDay) ||
            cornerstones.find(c => c.dayOfWeek === new Date().toLocaleDateString('en-US', { weekday: 'long' }));
        if (todayCornerstone) {
            context.todaysFocus = {
                name: todayCornerstone.name,
                description: todayCornerstone.description,
            };
        }
    }

    return context;
}


// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/ai/wellness-chat — Chat with wellness AI guide
// ─────────────────────────────────────────────────────────────────────────────
router.post('/wellness-chat', requireAuth, async (req, res, next) => {
    try {
        const { message } = req.body;
        if (!message || !message.trim()) {
            return res.status(400).json({ error: 'message is required' });
        }

        const uid = req.user.uid;
        console.log(`[ai/wellness-chat] uid: ${uid}, msg: "${message.slice(0, 60)}..."`);

        const context = await gatherFullContext(uid, req.userProfile);
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
        console.log(`[ai/report-analysis] uid: ${uid}`);

        const context = await gatherFullContext(uid, req.userProfile);

        // Build reportData summary for the frontend cards
        const totalDosCompleted = context.recentHistory.reduce((sum, d) => sum + d.tasksCompleted, 0);
        const scoresWithValues = context.recentHistory.filter(d => d.feelingScore !== null);
        const avgFeelingScore = scoresWithValues.length > 0
            ? Math.round((scoresWithValues.reduce((s, d) => s + d.feelingScore, 0) / scoresWithValues.length) * 10) / 10
            : null;

        const cornerstoneTotals = {};
        for (const day of context.recentHistory) {
            for (const cat of day.completedCategories) {
                cornerstoneTotals[cat] = (cornerstoneTotals[cat] || 0) + 1;
            }
        }

        const reportData = {
            totalDaysTracked: context.recentHistory.length,
            totalDosCompleted,
            avgFeelingScore,
            trend: context.trend || 'stable',
            cornerstoneTotals,
        };

        const analysis = await reportAnalysis(context);
        res.json({ analysis, reportData });
    } catch (err) {
        console.error('[ai/report-analysis] Error:', err.message);
        next(err);
    }
});

export default router;
