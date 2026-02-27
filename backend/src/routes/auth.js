import { Router } from 'express';
import { auth, db } from '../services/firebase.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// Admin emails that auto-get admin role on first sign-in
const ADMIN_EMAILS = ['clayskaggsmagic@gmail.com'];

/**
 * Build a default Firestore user profile document.
 */
function buildUserProfile({ uid, email, displayName, avatarUrl = null }) {
    const role = ADMIN_EMAILS.includes(email) ? 'admin' : 'user';
    if (role === 'admin') {
        console.log(`[auth] Admin account detected: ${email}`);
    }

    return {
        uid,
        email,
        displayName: displayName || email.split('@')[0],
        avatarUrl,
        dateOfBirth: null,
        joinDate: new Date().toISOString(),
        programStartDate: null, // Set when onboarding survey is completed
        timezone: 'America/New_York',
        emailOptIn: true,
        role,
        onboardingSurveyCompleted: false,
        lastActiveDate: new Date().toISOString(),
        labels: [],
        preferences: {
            fontSizeMultiplier: 1.0,
            highContrast: false,
            notificationsEnabled: true,
        },
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/auth/signup — Create new user via email/password
// No auth middleware: the client sends the Firebase ID token after client-side signup
// ─────────────────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res, next) => {
    try {
        const { idToken, displayName } = req.body;

        if (!idToken) {
            console.warn('[auth/signup] Missing idToken in request body');
            return res.status(400).json({ error: 'idToken is required' });
        }

        // Verify the token from the client
        const decoded = await auth.verifyIdToken(idToken);
        console.log(`[auth/signup] Token verified for uid: ${decoded.uid}, email: ${decoded.email}`);

        // Check if user profile already exists
        const existingDoc = await db.collection('users').doc(decoded.uid).get();
        if (existingDoc.exists) {
            console.log(`[auth/signup] Profile already exists for uid: ${decoded.uid}`);
            return res.json({ user: existingDoc.data(), created: false });
        }

        // Build and save profile
        const profile = buildUserProfile({
            uid: decoded.uid,
            email: decoded.email,
            displayName: displayName || decoded.name || null,
            avatarUrl: decoded.picture || null,
        });

        await db.collection('users').doc(decoded.uid).set(profile);
        console.log(`[auth/signup] Profile created for uid: ${decoded.uid}, role: ${profile.role}`);

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

        // Fetch or create profile
        const userRef = db.collection('users').doc(decoded.uid);
        let userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.log(`[auth/login] No profile found, creating one for: ${decoded.email}`);
            const profile = buildUserProfile({
                uid: decoded.uid,
                email: decoded.email,
                displayName: decoded.name || null,
                avatarUrl: decoded.picture || null,
            });
            await userRef.set(profile);
            userDoc = await userRef.get();
        }

        // Update last active
        await userRef.update({ lastActiveDate: new Date().toISOString() });

        const userData = userDoc.data();
        console.log(`[auth/login] Login success: ${decoded.uid}, role: ${userData.role}`);

        res.json({ user: { ...userData, lastActiveDate: new Date().toISOString() } });
    } catch (err) {
        console.error('[auth/login] Error:', err.message);
        next(err);
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /v1/auth/google — Handle Google Sign-In (same as login, but explicit)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/google', async (req, res, next) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ error: 'idToken is required' });
        }

        const decoded = await auth.verifyIdToken(idToken);
        console.log(`[auth/google] Google sign-in for uid: ${decoded.uid}, email: ${decoded.email}`);

        const userRef = db.collection('users').doc(decoded.uid);
        let userDoc = await userRef.get();

        if (!userDoc.exists) {
            console.log(`[auth/google] First-time Google user, creating profile: ${decoded.email}`);
            const profile = buildUserProfile({
                uid: decoded.uid,
                email: decoded.email,
                displayName: decoded.name || null,
                avatarUrl: decoded.picture || null,
            });
            await userRef.set(profile);
            userDoc = await userRef.get();
        } else {
            // Update avatar from Google if not already set
            const existing = userDoc.data();
            const updates = { lastActiveDate: new Date().toISOString() };
            if (!existing.avatarUrl && decoded.picture) {
                updates.avatarUrl = decoded.picture;
            }
            await userRef.update(updates);
        }

        const userData = (await userRef.get()).data();
        console.log(`[auth/google] Login success: ${decoded.uid}, role: ${userData.role}`);

        res.json({ user: userData });
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

        // In production, this would send via email service.
        // For now, Firebase Auth handles the email delivery automatically
        // when the client calls sendPasswordResetEmail().
        res.json({ message: 'Password reset email sent', email });
    } catch (err) {
        console.error('[auth/reset-password] Error:', err.message);
        // Don't reveal if email exists or not (security)
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
            'displayName', 'avatarUrl', 'dateOfBirth', 'timezone',
            'emailOptIn', 'preferences', 'onboardingSurveyCompleted',
            'programStartDate', 'labels',
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

        updates.lastActiveDate = new Date().toISOString();

        console.log(`[auth/me PATCH] Updating uid: ${req.user.uid}, fields: ${Object.keys(updates).join(', ')}`);

        await db.collection('users').doc(req.user.uid).update(updates);

        const updatedDoc = await db.collection('users').doc(req.user.uid).get();
        console.log(`[auth/me PATCH] Update success for uid: ${req.user.uid}`);

        res.json({ user: updatedDoc.data() });
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

        // Delete subcollections: tracking, surveyResponses
        const subcollections = ['tracking', 'surveyResponses'];
        for (const sub of subcollections) {
            const snapshot = await db.collection('users').doc(uid).collection(sub).get();
            const batch = db.batch();
            snapshot.docs.forEach(doc => batch.delete(doc.ref));
            if (snapshot.docs.length > 0) {
                await batch.commit();
                console.log(`[auth/me DELETE] Deleted ${snapshot.docs.length} docs from /users/${uid}/${sub}`);
            }
        }

        // Delete user profile document
        await db.collection('users').doc(uid).delete();
        console.log(`[auth/me DELETE] Deleted Firestore profile for uid: ${uid}`);

        // Delete Firebase Auth account
        await auth.deleteUser(uid);
        console.log(`[auth/me DELETE] Deleted Firebase Auth account for uid: ${uid}`);

        res.json({ message: 'Account and all data deleted successfully' });
    } catch (err) {
        console.error('[auth/me DELETE] Error:', err.message);
        next(err);
    }
});

export default router;
