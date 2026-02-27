'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import styles from './AppHeader.module.css';

/**
 * Global top-bar header with hamburger menu.
 * Visible on all authenticated pages (dashboard, community, report, settings).
 * Renders nothing for unauthenticated routes (login, signup, onboarding, etc.).
 */
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/onboarding', '/verify-email', '/invite', '/privacy', '/terms'];

export default function AppHeader() {
    const { user, logout } = useAuth();
    const pathname = usePathname();
    const [menuOpen, setMenuOpen] = useState(false);

    // Don't show on public/unauthenticated routes
    if (!user || PUBLIC_ROUTES.includes(pathname)) return null;

    return (
        <>
            <header className={styles.topBar}>
                <Link href="/dashboard" className={styles.logoLink}>
                    <span className={styles.logoMark}>FF</span>
                </Link>
                <button className={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
                    <span className={`${styles.hamburgerLine} ${menuOpen ? styles.open : ''}`} />
                    <span className={`${styles.hamburgerLine} ${menuOpen ? styles.open : ''}`} />
                    <span className={`${styles.hamburgerLine} ${menuOpen ? styles.open : ''}`} />
                </button>
            </header>

            {menuOpen && (
                <nav className={styles.menu}>
                    <Link href="/dashboard" className={styles.menuItem} onClick={() => setMenuOpen(false)}>My Wellness</Link>
                    <Link href="/community" className={styles.menuItem} onClick={() => setMenuOpen(false)} data-tour="community-link">Community</Link>
                    <Link href="/report" className={styles.menuItem} onClick={() => setMenuOpen(false)} data-tour="report-link">My Report</Link>
                    <Link href="/settings" className={styles.menuItem} onClick={() => setMenuOpen(false)} data-tour="settings-link">Settings</Link>
                    <button className={styles.menuLogout} onClick={() => { logout(); setMenuOpen(false); }}>Sign Out</button>
                </nav>
            )}
        </>
    );
}
