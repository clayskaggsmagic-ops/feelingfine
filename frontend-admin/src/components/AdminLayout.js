'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAdminAuth } from '@/lib/useAdminAuth';
import styles from './AdminLayout.module.css';

const NAV_ITEMS = [
    { href: '/dashboard', label: 'Dashboard', icon: '📊' },
    { href: '/doses', label: 'Daily Doses', icon: '💡' },
    { href: '/dos', label: 'Daily Dos', icon: '✅' },
    { href: '/surveys', label: 'Surveys', icon: '📋' },
    { href: '/podcasts', label: 'Podcasts', icon: '🎧' },
    { href: '/webinars', label: 'Webinars', icon: '🎥' },
    { href: '/emails', label: 'Emails', icon: '📧' },
    { href: '/users', label: 'Users', icon: '👥' },
    { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function AdminLayout({ children, breadcrumbs }) {
    const pathname = usePathname();
    const { profile, logout } = useAdminAuth();

    return (
        <div className={styles.layout}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <div className={styles.logo}>FF</div>
                    <span className={styles.logoText}>Admin</span>
                </div>

                <nav className={styles.nav}>
                    {NAV_ITEMS.map(item => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`${styles.navItem} ${pathname === item.href || pathname.startsWith(item.href + '/') ? styles.navActive : ''}`}
                        >
                            <span className={styles.navIcon}>{item.icon}</span>
                            <span className={styles.navLabel}>{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <div className={styles.userInfo}>
                        <span className={styles.userName}>{profile?.displayName || 'Admin'}</span>
                        <span className={styles.userRole}>Administrator</span>
                    </div>
                    <button onClick={logout} className={styles.logoutBtn}>
                        Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.main}>
                {breadcrumbs && (
                    <div className={styles.breadcrumbs}>
                        <Link href="/dashboard" className={styles.breadcrumbLink}>Dashboard</Link>
                        {breadcrumbs.map((crumb, i) => (
                            <span key={i}>
                                <span className={styles.breadcrumbSep}>›</span>
                                {crumb.href ? (
                                    <Link href={crumb.href} className={styles.breadcrumbLink}>{crumb.label}</Link>
                                ) : (
                                    <span className={styles.breadcrumbCurrent}>{crumb.label}</span>
                                )}
                            </span>
                        ))}
                    </div>
                )}
                {children}
            </main>
        </div>
    );
}
