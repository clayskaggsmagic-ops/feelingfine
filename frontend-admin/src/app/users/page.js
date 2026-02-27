'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import styles from '../doses/content.module.css';

export default function UsersPage() {
    const { isAuthenticated, loading } = useAdminAuth();
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [search, setSearch] = useState('');
    const [loadingData, setLoadingData] = useState(true);
    const [selected, setSelected] = useState(null);
    const [toast, setToast] = useState('');

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/'); }, [loading, isAuthenticated, router]);

    const fetchUsers = useCallback(async () => {
        setLoadingData(true);
        try {
            const data = await api.get(`/v1/admin/users?page=${page}&search=${encodeURIComponent(search)}`);
            setUsers(data.users || []);
            setTotal(data.total || 0);
            setPages(data.pages || 1);
        } catch (err) { console.error(err); }
        finally { setLoadingData(false); }
    }, [page, search]);

    useEffect(() => { if (isAuthenticated) fetchUsers(); }, [isAuthenticated, fetchUsers]);

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

    async function viewUser(uid) {
        try {
            const data = await api.get(`/v1/admin/users/${uid}`);
            setSelected(data);
        } catch (err) { showToast('Error loading user'); }
    }

    async function handleAction(uid, action) {
        const msg = action === 'reset-program' ? 'Reset program day for this user?' : 'Deactivate this account?';
        if (!confirm(msg)) return;
        try {
            await api.patch(`/v1/admin/users/${uid}`, { action });
            showToast(action === 'reset-program' ? 'Program day reset' : 'Account deactivated');
            fetchUsers();
            if (selected) viewUser(uid);
        } catch (err) { showToast('Error: ' + err.message); }
    }

    function exportCSV() {
        window.open(`${process.env.NEXT_PUBLIC_API_URL}/v1/admin/users-export`, '_blank');
    }

    if (loading || !isAuthenticated) return null;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Users' }]}>
            {toast && <div className={styles.toast}>{toast}</div>}

            <div className={styles.header}>
                <h1 className={styles.title}>Users ({total})</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        placeholder="Search by name or email..."
                        style={{ width: '260px' }}
                    />
                    <button className="btn-secondary" onClick={exportCSV}>📥 Export CSV</button>
                </div>
            </div>

            {/* User Detail Modal */}
            {selected && (
                <div className={styles.modal} onClick={() => setSelected(null)}>
                    <div className={styles.modalCard} onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <h2 className={styles.modalTitle}>{selected.user?.displayName || 'User'}</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                            <div><strong style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Email</strong><p>{selected.user?.email}</p></div>
                            <div><strong style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Role</strong><p>{selected.user?.role || 'user'}</p></div>
                            <div><strong style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Program Start</strong><p>{selected.user?.programStartDate ? new Date(selected.user.programStartDate).toLocaleDateString() : 'N/A'}</p></div>
                            <div><strong style={{ fontSize: '0.75rem', color: 'var(--admin-text-secondary)', textTransform: 'uppercase' }}>Survey Done</strong><p>{selected.user?.onboardingSurveyCompleted ? '✅ Yes' : '❌ No'}</p></div>
                        </div>

                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Tracking ({selected.tracking?.length || 0} days)</h3>
                        {selected.tracking?.length > 0 ? (
                            <div style={{ maxHeight: '120px', overflow: 'auto', marginBottom: '1rem', fontSize: '0.85rem' }}>
                                {selected.tracking.slice(0, 10).map(t => (
                                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', borderBottom: '1px solid #f1f3f5' }}>
                                        <span>{t.dateKey}</span>
                                        <span>Score: {t.feelingScore ?? '—'}</span>
                                    </div>
                                ))}
                            </div>
                        ) : <p style={{ color: 'var(--admin-text-secondary)', marginBottom: '1rem', fontSize: '0.85rem' }}>No tracking data</p>}

                        <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Survey Responses ({selected.surveyResponses?.length || 0})</h3>
                        {selected.surveyResponses?.length > 0 ? (
                            <div style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
                                {selected.surveyResponses.map(r => (
                                    <div key={r.id} style={{ padding: '0.3rem 0', borderBottom: '1px solid #f1f3f5' }}>
                                        {r.surveyId} — Day {r.programDay} — {new Date(r.submittedAt).toLocaleDateString()}
                                    </div>
                                ))}
                            </div>
                        ) : <p style={{ color: 'var(--admin-text-secondary)', marginBottom: '1rem', fontSize: '0.85rem' }}>No survey responses</p>}

                        <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--admin-border)', paddingTop: '1rem' }}>
                            <button className="btn-secondary" onClick={() => handleAction(selected.user?.uid, 'reset-program')}>🔄 Reset Program</button>
                            <button style={{ background: 'rgba(231,76,60,0.08)', color: 'var(--admin-error)', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }} onClick={() => handleAction(selected.user?.uid, 'deactivate')}>⛔ Deactivate</button>
                            <div style={{ flex: 1 }} />
                            <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Survey</th><th>Joined</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loadingData ? (
                            <tr><td colSpan={6} className={styles.emptyRow}>Loading...</td></tr>
                        ) : users.length === 0 ? (
                            <tr><td colSpan={6} className={styles.emptyRow}>No users found.</td></tr>
                        ) : users.map(u => (
                            <tr key={u.uid}>
                                <td style={{ fontWeight: 600 }}>{u.displayName || '—'}</td>
                                <td>{u.email}</td>
                                <td><span className={styles.badge}>{u.role || 'user'}</span></td>
                                <td>{u.onboardingSurveyCompleted ? '✅' : '—'}</td>
                                <td style={{ fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>{u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</td>
                                <td><button className={styles.editBtn} onClick={() => viewUser(u.uid)}>View</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {pages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
                    <button className="btn-secondary" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                    <span style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', color: 'var(--admin-text-secondary)' }}>Page {page} of {pages}</span>
                    <button className="btn-secondary" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
            )}
        </AdminLayout>
    );
}
