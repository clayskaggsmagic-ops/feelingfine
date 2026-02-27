'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import styles from './dashboard.module.css';

export default function AdminDashboardPage() {
    const { isAuthenticated, loading, profile } = useAdminAuth();
    const router = useRouter();
    const [analytics, setAnalytics] = useState(null);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && !isAuthenticated) router.push('/');
    }, [loading, isAuthenticated, router]);

    const fetchAnalytics = useCallback(async () => {
        try {
            const data = await api.get('/v1/admin/analytics');
            setAnalytics(data);
        } catch (err) {
            console.error('[admin/dashboard] Error:', err);
        } finally {
            setLoadingData(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) fetchAnalytics();
    }, [isAuthenticated, fetchAnalytics]);

    if (loading || !isAuthenticated) {
        return (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <div className="spinner" />
            </div>
        );
    }

    const greeting = () => {
        const h = new Date().getHours();
        if (h < 12) return 'Good morning';
        if (h < 17) return 'Good afternoon';
        return 'Good evening';
    };

    return (
        <AdminLayout>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>{greeting()}, {profile?.displayName?.split(' ')[0] || 'Admin'}</h1>
                    <p className={styles.subtitle}>Here&apos;s your platform overview for today.</p>
                </div>
                <span className={styles.date}>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
            </div>

            {/* ── Stat Cards ── */}
            <div className={styles.statsGrid}>
                <div className={`card ${styles.statCard}`}>
                    <span className={styles.statIcon}>👥</span>
                    <div className={styles.statBody}>
                        <span className={styles.statNum}>
                            {loadingData ? '—' : analytics?.totalUsers ?? 0}
                        </span>
                        <span className={styles.statLabel}>Total Users</span>
                    </div>
                </div>
                <div className={`card ${styles.statCard}`}>
                    <span className={styles.statIcon}>🟢</span>
                    <div className={styles.statBody}>
                        <span className={styles.statNum}>
                            {loadingData ? '—' : analytics?.activeToday ?? 0}
                        </span>
                        <span className={styles.statLabel}>Active Today</span>
                    </div>
                </div>
                <div className={`card ${styles.statCard}`}>
                    <span className={styles.statIcon}>📅</span>
                    <div className={styles.statBody}>
                        <span className={styles.statNum}>
                            {analytics?.todayDate
                                ? new Date(analytics.todayDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                : '—'}
                        </span>
                        <span className={styles.statLabel}>Today</span>
                    </div>
                </div>
            </div>

            {/* ── Quick Actions ── */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Quick Actions</h2>
                <div className={styles.actionsGrid}>
                    <button onClick={() => router.push('/doses')} className={`card ${styles.actionCard}`}>
                        <span className={styles.actionIcon}>💡</span>
                        <span className={styles.actionLabel}>Edit Today&apos;s Dose</span>
                    </button>
                    <button onClick={() => router.push('/dos')} className={`card ${styles.actionCard}`}>
                        <span className={styles.actionIcon}>✅</span>
                        <span className={styles.actionLabel}>Edit Today&apos;s Dos</span>
                    </button>
                    <button onClick={() => router.push('/emails')} className={`card ${styles.actionCard}`}>
                        <span className={styles.actionIcon}>📧</span>
                        <span className={styles.actionLabel}>Edit Tomorrow&apos;s Email</span>
                    </button>
                    <button onClick={() => router.push('/users')} className={`card ${styles.actionCard}`}>
                        <span className={styles.actionIcon}>👥</span>
                        <span className={styles.actionLabel}>View All Users</span>
                    </button>
                    <button onClick={() => router.push('/surveys')} className={`card ${styles.actionCard}`}>
                        <span className={styles.actionIcon}>📋</span>
                        <span className={styles.actionLabel}>Create New Survey</span>
                    </button>
                    <button onClick={() => router.push('/podcasts')} className={`card ${styles.actionCard}`}>
                        <span className={styles.actionIcon}>🎧</span>
                        <span className={styles.actionLabel}>Manage Podcasts</span>
                    </button>
                </div>
            </section>
        </AdminLayout>
    );
}
