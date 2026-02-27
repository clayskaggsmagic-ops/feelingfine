import { Router } from 'express';
import { auth } from '../services/firebase.js';
import { getUserByUid, upsertUser, updateUser, deleteUser } from '../services/dataConnect.js';
import { requireAuth } from '../middleware/auth.js';
import { sendDoseEmailToUser } from '../jobs/dailyEmailJob.js';

const router = Router();

// Admin emails that auto-get admin role on first sign-in
const ADMIN_EMAILS = ['clayskaggsmagic@gmail.com'];

/**
 * Build a default user profile row for PostgreSQL.
 */
function buildUserProfile({ uid, email, displayName, photoURL = null, provider = 'email', timezone = null }) {
    const role = ADMIN_EMAILS.includes(email) ? 'admin' : 'user';
    if (role === 'admin') {
        console.log(`[auth] Admin account detected: ${email}`);
    }

    return {
        id: uid,
        email,
        displayName: displayName || email.split('@')[0],
        firstName: null,
        lastName: null,
        role,
        provider,
        photoURL,
        timezone: timezone || 'America/New_York',
        programStartDate: null,
        labels: [],
        fontSizeMultiplier: 1.0,
        emailOptIn: true,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/auth/signup — Create new user via email/password
// ─────────────────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res, next) => {
    try {
        const { idToken, displayName, timezone } = req.body;

        if (!idToken) {
            console.warn('[auth/signup] Missing idToken in request body');
            return res.status(400).json({ error: 'idToken is required' });
        }

        const decoded = await auth.verifyIdToken(idToken);
        console.log(`[auth/signup] Token verified for uid: ${decoded.uid}, email: ${decoded.email}`);

        // Check if user profile already exists
        const existing = await getUserByUid(decoded.uid);
        if (existing) {
            console.log(`[auth/signup] Profile already exists for uid: ${decoded.uid}`);
            return res.json({ user: existing, created: false });
        }

        // Build and save profile
        const profile = buildUserProfile({
            uid: decoded.uid,
            email: decoded.email,
            displayName: displayName || decoded.name || null,
            photoURL: decoded.picture || null,
            timezone,
        });

        await upsertUser(profile);
        console.log(`[auth/signup] Profile created for uid: ${decoded.uid}, role: ${profile.role}`);

        // Send Day 1 dose email immediately (non-blocking)
        if (profile.emailOptIn) {
            sendDoseEmailToUser(profile).catch(err => {
                console.error('[auth/signup] Welcome dose email failed:', err.message);
            });
        }

        res.status(201).json({ user: profile, created: true });
    } catch (err) {
        console.error('[auth/signup] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/auth/login — Validate Firebase token, return or create profile
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            console.warn('[auth/login] Missing idToken');
            return res.status(400).json({ error: 'idToken is required' });
        }

        const decoded = await auth.verifyIdToken(idToken);
        console.log(`[auth/login] Token verified for uid: ${decoded.uid}`);

        let user = await getUserByUid(decoded.uid);

        if (!user) {
            console.log(`[auth/login] No profile found, creating one for: ${decoded.email}`);
            const profile = buildUserProfile({
                uid: decoded.uid,
                email: decoded.email,
                displayName: decoded.name || null,
                photoURL: decoded.picture || null,
            });
            await upsertUser(profile);
            user = profile;
        }

        console.log(`[auth/login] Login success: ${decoded.uid}, role: ${user.role}`);
        res.json({ user });
    } catch (err) {
        console.error('[auth/login] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/auth/google — Handle Google Sign-In
// ─────────────────────────────────────────────────────────────────────────────
router.post('/google', async (req, res, next) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ error: 'idToken is required' });
        }

        const decoded = await auth.verifyIdToken(idToken);
        console.log(`[auth/google] Google sign-in for uid: ${decoded.uid}, email: ${decoded.email}`);

        let user = await getUserByUid(decoded.uid);

        if (!user) {
            console.log(`[auth/google] First-time Google user, creating profile: ${decoded.email}`);
            const profile = buildUserProfile({
                uid: decoded.uid,
                email: decoded.email,
                displayName: decoded.name || null,
                photoURL: decoded.picture || null,
                provider: 'google',
            });
            await upsertUser(profile);
            user = profile;
        } else if (!user.photoURL && decoded.picture) {
            await updateUser(decoded.uid, { photoURL: decoded.picture });
            user.photoURL = decoded.picture;
        }

        console.log(`[auth/google] Login success: ${decoded.uid}, role: ${user.role}`);
        res.json({ user });
    } catch (err) {
        console.error('[auth/google] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/auth/reset-password — Trigger password reset email
// ─────────────────────────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'email is required' });
        }

        const link = await auth.generatePasswordResetLink(email);
        console.log(`[auth/reset-password] Reset link generated for: ${email}`);

        res.json({ message: 'Password reset email sent', email });
    } catch (err) {
        console.error('[auth/reset-password] Error:', err.message);
        res.json({ message: 'If that email exists, a reset link has been sent' });
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/auth/me — Get current user profile (requires auth)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res, next) => {
    try {
        if (!req.userProfile) {
            console.warn(`[auth/me] No profile found for uid: ${req.user.uid}`);
            return res.status(404).json({ error: 'User profile not found' });
        }

        // Calculate programDay dynamically
        const profile = { ...req.userProfile };
        if (profile.programStartDate) {
            const start = new Date(profile.programStartDate);
            const now = new Date();
            profile.programDay = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
        } else {
            profile.programDay = 0;
        }

        console.log(`[auth/me] Profile fetched: ${req.user.uid}, programDay: ${profile.programDay}`);
        res.json({ user: profile });
    } catch (err) {
        console.error('[auth/me] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /v1/auth/me — Update user profile (requires auth)
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/me', requireAuth, async (req, res, next) => {
    try {
        const allowedFields = [
            'displayName', 'firstName', 'lastName', 'photoURL',
            'emailOptIn', 'dailyReminder', 'weeklyReport', 'challengeAlerts',
            'fontSizeMultiplier', 'timezone',
            'programStartDate', 'labels',
            'walkthroughCompleted',
        ];

        const updates = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        // Never allow role to be updated via this endpoint
        delete updates.role;

        console.log(`[auth/me PATCH] Updating uid: ${req.user.uid}, fields: ${Object.keys(updates).join(', ')}`);

        await updateUser(req.user.uid, updates);

        const updated = await getUserByUid(req.user.uid);
        console.log(`[auth/me PATCH] Update success for uid: ${req.user.uid}`);

        res.json({ user: updated });
    } catch (err) {
        console.error('[auth/me PATCH] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /v1/auth/me — Delete account and all associated data (requires auth)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/me', requireAuth, async (req, res, next) => {
    try {
        const uid = req.user.uid;
        console.log(`[auth/me DELETE] Starting account deletion for uid: ${uid}`);

        // Cascade-delete all child records first
        const { mutate } = await import('../services/dataConnect.js');
        try { await mutate(`mutation($uid: String!) { trackingDay_deleteMany(where: { userId: { eq: $uid } }) }`, { uid }); } catch { }
        try { await mutate(`mutation($uid: String!) { completedDo_deleteMany(where: { userId: { eq: $uid } }) }`, { uid }); } catch { }
        try { await mutate(`mutation($uid: String!) { customDo_deleteMany(where: { userId: { eq: $uid } }) }`, { uid }); } catch { }
        try { await mutate(`mutation($uid: String!) { surveyResponse_deleteMany(where: { userId: { eq: $uid } }) }`, { uid }); } catch { }
        console.log(`[auth/me DELETE] Deleted child records for uid: ${uid}`);

        // Delete user row
        await deleteUser(uid);
        console.log(`[auth/me DELETE] Deleted PostgreSQL user record for uid: ${uid}`);

        // Delete Firebase Auth account
        await auth.deleteUser(uid);
        console.log(`[auth/me DELETE] Deleted Firebase Auth account for uid: ${uid}`);

        res.json({ message: 'Account and all data deleted successfully' });
    } catch (err) {
        console.error('[auth/me DELETE] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /v1/auth/me/export — Export all user data (GDPR compliance)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me/export', requireAuth, async (req, res, next) => {
    try {
        const uid = req.user.uid;
        const { query } = await import('../services/dataConnect.js');

        // Fetch all user data in parallel
        const [profile, trackingDays, completedDos, customDos, surveyResponses] = await Promise.all([
            getUserByUid(uid),
            query(`query($uid: String!) { trackingDays(where: { userId: { eq: $uid } }, orderBy: [{ date: DESC }]) { id date feelingScore notes createdAt } }`, { uid }).catch(() => ({ data: { trackingDays: [] } })),
            query(`query($uid: String!) { completedDos(where: { userId: { eq: $uid } }) { id doId category completedAt } }`, { uid }).catch(() => ({ data: { completedDos: [] } })),
            query(`query($uid: String!) { customDos(where: { userId: { eq: $uid } }) { id text category createdAt } }`, { uid }).catch(() => ({ data: { customDos: [] } })),
            query(`query($uid: String!) { surveyResponses(where: { userId: { eq: $uid } }) { id surveyId answers completedAt } }`, { uid }).catch(() => ({ data: { surveyResponses: [] } })),
        ]);

        const exportData = {
            exportedAt: new Date().toISOString(),
            profile: profile || {},
            trackingDays: trackingDays?.data?.trackingDays || [],
            completedDos: completedDos?.data?.completedDos || [],
            customDos: customDos?.data?.customDos || [],
            surveyResponses: surveyResponses?.data?.surveyResponses || [],
        };

        res.setHeader('Content-Disposition', `attachment; filename="feelingfine-export-${uid}.json"`);
        res.setHeader('Content-Type', 'application/json');
        res.json(exportData);
    } catch (err) {
        console.error('[auth/me/export] Error:', err.message);
        next(err);
    }
});

export default router;
