'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import WalkthroughOverlay from './WalkthroughOverlay';

/**
 * Wrapper that mounts at the layout level so the walkthrough
 * persists across page navigations (/dashboard → /community → /report).
 * Only shows for authenticated users who haven't completed the walkthrough.
 */
export default function WalkthroughWrapper() {
    const { profile, loading, isAuthenticated, refreshProfile } = useAuth();
    const [show, setShow] = useState(false);
    const pathname = usePathname();
    const hasTriggered = useRef(false);

    useEffect(() => {
        // Don't trigger more than once per session
        if (hasTriggered.current || show) return;

        console.log('[Walkthrough] Check:', {
            loading,
            isAuthenticated,
            hasProfile: !!profile,
            walkthroughCompleted: profile?.walkthroughCompleted,
            pathname,
        });

        if (loading) return; // Still loading, wait
        if (!isAuthenticated) return; // Not logged in
        if (!profile) return; // Profile not loaded yet
        if (profile.walkthroughCompleted === true) return; // Already completed
        const path = pathname.replace(/\/+$/, ''); // strip trailing slash
        if (path !== '/dashboard') return; // Not on dashboard

        console.log('[Walkthrough] ✅ All conditions met — triggering in 800ms');
        hasTriggered.current = true;
        const timer = setTimeout(() => setShow(true), 800);
        return () => clearTimeout(timer);
    }, [loading, isAuthenticated, profile, pathname, show]);

    async function handleComplete() {
        setShow(false);
        try {
            await api.patch('/v1/auth/me', { walkthroughCompleted: true });
            await refreshProfile(); // Update in-memory profile so it won't re-trigger
        } catch (err) {
            console.error('Failed to save walkthrough status:', err);
        }
    }

    if (!show) return null;

    return <WalkthroughOverlay onComplete={handleComplete} />;
}
