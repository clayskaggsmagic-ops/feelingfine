'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import styles from './MobileNav.module.css';

/**
 * Mobile bottom tab bar — only visible on screens ≤ 768px.
 * Two main tabs: "My Wellness" (dashboard) and "More" (slide-up sheet).
 */
export default function MobileNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { user } = useAuth();
    const [showMore, setShowMore] = useState(false);

    if (!user) return null;

    // Hide nav on pre-authenticated routes
    const PUBLIC_ROUTES = ['/', '/login', '/signup', '/onboarding', '/verify-email', '/invite', '/privacy', '/terms'];
    const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname;
    if (PUBLIC_ROUTES.includes(normalizedPath)) return null;

    const isWellness = normalizedPath === '/dashboard';

    async function handleLogout() {
        await signOut(auth);
        router.push('/');
    }

    return (
        <>
            {/* Bottom Tab Bar */}
            <nav className={styles.bar}>
                <button className={`${styles.tabBtn} ${isWellness ? styles.tabActive : ''}`}
                    onClick={() => { router.push('/dashboard'); setShowMore(false); }}>
                    <span className={styles.tabIcon}>🏠</span>
                    <span className={styles.tabLabel}>My Wellness</span>
                </button>
                <button className={`${styles.tabBtn} ${showMore ? styles.tabActive : ''}`}
                    onClick={() => setShowMore(!showMore)}>
                    <span className={styles.tabIcon}>☰</span>
                    <span className={styles.tabLabel}>More</span>
                </button>
            </nav>

            {/* Slide-up Sheet */}
            {showMore && (
                <div className={styles.overlay} onClick={() => setShowMore(false)}>
                    <div className={styles.sheet} onClick={e => e.stopPropagation()}>
                        <div className={styles.handle} />
                        <button className={styles.sheetItem} onClick={() => { router.push('/community'); setShowMore(false); }}>
                            <span>👥</span> Community
                        </button>
                        <button className={styles.sheetItem} onClick={() => { router.push('/report'); setShowMore(false); }}>
                            <span>📊</span> Report
                        </button>
                        <button className={styles.sheetItem} onClick={() => { router.push('/settings'); setShowMore(false); }}>
                            <span>⚙️</span> Settings
                        </button>
                        <div className={styles.sheetDivider} />
                        <button className={`${styles.sheetItem} ${styles.sheetItemDanger}`} onClick={handleLogout}>
                            <span>🚪</span> Log Out
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
