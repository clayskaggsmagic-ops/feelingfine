/**
 * Middleware: Checks that the authenticated user has admin role.
 * Must be used AFTER requireAuth middleware.
 */
export function requireAdmin(req, res, next) {
    if (!req.userProfile) {
        console.warn(`[adminAuth] No user profile found for uid: ${req.user?.uid}`);
        return res.status(403).json({ error: 'User profile not found' });
    }

    if (req.userProfile.role !== 'admin') {
        console.warn(`[adminAuth] Access denied for uid: ${req.user.uid}, role: ${req.userProfile.role}`);
        return res.status(403).json({ error: 'Admin access required' });
    }

    console.log(`[adminAuth] Admin access granted: ${req.user.uid}`);
    next();
}
