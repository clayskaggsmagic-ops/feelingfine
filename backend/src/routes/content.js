import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getDailyDose, getDailyDos, calculateProgramDay } from '../services/programService.js';
import { listCornerstones, query } from '../services/dataConnect.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/content/daily-dose — Today's Daily Dose for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/daily-dose', requireAuth, async (req, res, next) => {
    try {
        const user = req.userProfile;
        if (!user) return res.status(404).json({ error: 'User profile not found' });

        const result = await getDailyDose(user);
        console.log(`[content/daily-dose] Returning dose for uid: ${user.uid}, phase: ${result.phase}`);
        res.json(result);
    } catch (err) {
        console.error('[content/daily-dose] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/content/daily-dos — Today's Daily Dos for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/daily-dos', requireAuth, async (req, res, next) => {
    try {
        const user = req.userProfile;
        if (!user) return res.status(404).json({ error: 'User profile not found' });

        const result = await getDailyDos(user);
        console.log(`[content/daily-dos] Returning ${result.dos.length} dos for uid: ${user.uid}, focus: ${result.focusedCornerstone.id}`);
        res.json(result);
    } catch (err) {
        console.error('[content/daily-dos] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/content/cornerstones — All cornerstone definitions
// ─────────────────────────────────────────────────────────────────────────────
router.get('/cornerstones', requireAuth, async (req, res, next) => {
    try {
        const cornerstones = await listCornerstones();
        const programDay = calculateProgramDay(req.userProfile || {});
        console.log(`[content/cornerstones] Returning all ${cornerstones.length} cornerstones`);
        res.json({ cornerstones, programDay });
    } catch (err) {
        console.error('[content/cornerstones] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/content/podcasts — Published podcasts (optionally filtered by category)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/podcasts', requireAuth, async (req, res, next) => {
    try {
        const data = await query(`query { podcasts(where: { isActive: { eq: true } }) {
            id title description category audioUrl duration publishedAt
        }}`);
        let podcasts = data.podcasts || [];
        if (req.query.category) podcasts = podcasts.filter(p => p.category === req.query.category);
        res.json({ podcasts });
    } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/content/webinars — All webinars
// ─────────────────────────────────────────────────────────────────────────────
router.get('/webinars', requireAuth, async (req, res, next) => {
    try {
        const data = await query(`query { webinars {
            id title description date registrationUrl recordingUrl hostName status
        }}`);
        res.json({ webinars: data.webinars || [] });
    } catch (err) { next(err); }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/content/weekly-challenge — Current weekly challenge from app settings
// ─────────────────────────────────────────────────────────────────────────────
router.get('/weekly-challenge', requireAuth, async (req, res, next) => {
    try {
        const data = await query(`query { appSetting(id: "main") { weeklyChallenge weeklyChallengeCornerstoneId } }`);
        res.json({
            challenge: data.appSetting?.weeklyChallenge || null,
            cornerstoneId: data.appSetting?.weeklyChallengeCornerstoneId || null,
        });
    } catch (err) { next(err); }
});

export default router;

