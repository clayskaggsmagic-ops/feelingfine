import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { CORNERSTONES, getDailyDose, getDailyDos, calculateProgramDay } from '../services/programService.js';

const router = Router();

// All content routes require authentication
router.use(requireAuth);

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/content/daily-dose — Today's Daily Dose for the authenticated user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/daily-dose', async (req, res, next) => {
    try {
        const user = req.userProfile;
        if (!user) {
            return res.status(404).json({ error: 'User profile not found' });
        }

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
router.get('/daily-dos', async (req, res, next) => {
    try {
        const user = req.userProfile;
        if (!user) {
            return res.status(404).json({ error: 'User profile not found' });
        }

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
router.get('/cornerstones', async (req, res, next) => {
    try {
        const programDay = calculateProgramDay(req.userProfile || {});
        console.log(`[content/cornerstones] Returning all ${CORNERSTONES.length} cornerstones`);

        res.json({
            cornerstones: CORNERSTONES,
            programDay,
        });
    } catch (err) {
        console.error('[content/cornerstones] Error:', err.message);
        next(err);
    }
});

export default router;
