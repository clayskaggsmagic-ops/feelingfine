import { auth } from '../services/firebase.js';
import { getUserByUid } from '../services/dataConnect.js';

/**
 * Middleware: Verifies Firebase ID token from Authorization header.
 * On success, attaches decoded token to req.user and full profile to req.userProfile.
 *
 * Profile is loaded from PostgreSQL via Data Connect (NOT Firestore).
 */
export async function requireAuth(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
        console.warn('[auth] Missing or malformed Authorization header');
        return res.status(401).json({ error: 'Missing or invalid authorization token' });
    }

    const token = header.split('Bearer ')[1];

    try {
        const decoded = await auth.verifyIdToken(token);
        req.user = decoded;

        // Fetch full user profile from PostgreSQL via Data Connect
        const user = await getUserByUid(decoded.uid);
        req.userProfile = user ? { uid: decoded.uid, ...user } : null;

        console.log(`[auth] Authenticated: ${decoded.uid} (${decoded.email})`);
        next();
    } catch (err) {
        console.error('[auth] Token verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
}
