'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import styles from '../doses/content.module.css';

const CATEGORIES = ['Nutrition', 'Movement', 'Sleep', 'Stress Management', 'Social Connection', 'Brain Health', 'Healthy Aging'];

export default function PodcastsPage() {
    const { isAuthenticated, loading } = useAdminAuth();
    const router = useRouter();
    const [podcasts, setPodcasts] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/'); }, [loading, isAuthenticated, router]);

    const fetchPodcasts = useCallback(async () => {
        try {
            const data = await api.get('/v1/admin/podcasts');
            setPodcasts(data.podcasts || []);
        } catch (err) { console.error(err); }
        finally { setLoadingData(false); }
    }, []);

    useEffect(() => { if (isAuthenticated) fetchPodcasts(); }, [isAuthenticated, fetchPodcasts]);

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

    async function handleSave() {
        setSaving(true);
        try {
            if (editing.id) {
                const { id, ...data } = editing;
                await api.patch(`/v1/admin/podcasts/${id}`, data);
                showToast('Podcast updated!');
            } else {
                const data = { ...editing, publishedAt: new Date().toISOString() };
                await api.post('/v1/admin/podcasts', data);
                showToast('Podcast created!');
            }
            setEditing(null);
            fetchPodcasts();
        } catch (err) { showToast('Error: ' + err.message); }
        finally { setSaving(false); }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this podcast?')) return;
        try {
            await api.delete(`/v1/admin/podcasts/${id}`);
            showToast('Podcast deleted');
            fetchPodcasts();
        } catch (err) { showToast('Error: ' + err.message); }
    }

    if (loading || !isAuthenticated) return null;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Podcasts' }]}>
            {toast && <div className={styles.toast}>{toast}</div>}

            <div className={styles.header}>
                <h1 className={styles.title}>Podcasts</h1>
                <button className="btn-primary" onClick={() => setEditing({ title: '', description: '', category: CATEGORIES[0], audioUrl: '', duration: '', isActive: true })}>+ New Podcast</button>
            </div>

            {editing && (
                <div className={styles.modal}>
                    <div className={styles.modalCard}>
                        <h2 className={styles.modalTitle}>{editing.id ? 'Edit Podcast' : 'New Podcast'}</h2>
                        <div className={styles.formGrid}>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>Title</span>
                                <input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>Category</span>
                                <select value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </label>
                            <label className={styles.field}>
                                <span>Duration (e.g. 12:30)</span>
                                <input value={editing.duration || ''} onChange={e => setEditing({ ...editing, duration: e.target.value })} placeholder="mm:ss" />
                            </label>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>Audio URL (Firebase Storage)</span>
                                <input value={editing.audioUrl || ''} onChange={e => setEditing({ ...editing, audioUrl: e.target.value })} placeholder="https://storage.googleapis.com/..." />
                            </label>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>Description</span>
                                <textarea rows={3} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>Published</span>
                                <select value={editing.isActive ? 'true' : 'false'} onChange={e => setEditing({ ...editing, isActive: e.target.value === 'true' })}>
                                    <option value="true">Yes — Visible to users</option>
                                    <option value="false">No — Draft</option>
                                </select>
                            </label>
                        </div>
                        <div className={styles.modalActions}>
                            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Podcast'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead><tr><th>Title</th><th>Category</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loadingData ? (
                            <tr><td colSpan={5} className={styles.emptyRow}>Loading...</td></tr>
                        ) : podcasts.length === 0 ? (
                            <tr><td colSpan={5} className={styles.emptyRow}>No podcasts yet. Create one!</td></tr>
                        ) : podcasts.map(p => (
                            <tr key={p.id}>
                                <td style={{ fontWeight: 600 }}>{p.title}</td>
                                <td><span className={styles.badge}>{p.category}</span></td>
                                <td>{p.duration || '—'}</td>
                                <td><span className={p.isActive ? styles.statusActive : styles.statusInactive}>{p.isActive ? 'Published' : 'Draft'}</span></td>
                                <td className={styles.actions}>
                                    <button className={styles.editBtn} onClick={() => setEditing({ ...p })}>Edit</button>
                                    <button className={styles.deleteBtn} onClick={() => handleDelete(p.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
