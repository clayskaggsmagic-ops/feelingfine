'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import styles from '../doses/content.module.css';

const STATUSES = ['upcoming', 'live', 'recorded'];

export default function WebinarsPage() {
    const { isAuthenticated, loading } = useAdminAuth();
    const router = useRouter();
    const [webinars, setWebinars] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/'); }, [loading, isAuthenticated, router]);

    const fetchWebinars = useCallback(async () => {
        try {
            const data = await api.get('/v1/admin/webinars');
            setWebinars(data.webinars || []);
        } catch (err) { console.error(err); }
        finally { setLoadingData(false); }
    }, []);

    useEffect(() => { if (isAuthenticated) fetchWebinars(); }, [isAuthenticated, fetchWebinars]);

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

    async function handleSave() {
        setSaving(true);
        try {
            if (editing.id) {
                const { id, ...data } = editing;
                await api.patch(`/v1/admin/webinars/${id}`, data);
                showToast('Webinar updated!');
            } else {
                await api.post('/v1/admin/webinars', editing);
                showToast('Webinar created!');
            }
            setEditing(null);
            fetchWebinars();
        } catch (err) { showToast('Error: ' + err.message); }
        finally { setSaving(false); }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this webinar?')) return;
        try {
            await api.delete(`/v1/admin/webinars/${id}`);
            showToast('Webinar deleted');
            fetchWebinars();
        } catch (err) { showToast('Error: ' + err.message); }
    }

    function formatDate(d) {
        if (!d) return '—';
        return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' });
    }

    if (loading || !isAuthenticated) return null;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Webinars' }]}>
            {toast && <div className={styles.toast}>{toast}</div>}

            <div className={styles.header}>
                <h1 className={styles.title}>Webinars</h1>
                <button className="btn-primary" onClick={() => setEditing({ title: '', description: '', date: '', registrationUrl: '', recordingUrl: '', hostName: '', status: 'upcoming' })}>+ New Webinar</button>
            </div>

            {editing && (
                <div className={styles.modal}>
                    <div className={styles.modalCard}>
                        <h2 className={styles.modalTitle}>{editing.id ? 'Edit Webinar' : 'New Webinar'}</h2>
                        <div className={styles.formGrid}>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>Title</span>
                                <input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>Date & Time</span>
                                <input type="datetime-local" value={editing.date ? editing.date.slice(0, 16) : ''} onChange={e => setEditing({ ...editing, date: new Date(e.target.value).toISOString() })} />
                            </label>
                            <label className={styles.field}>
                                <span>Host Name</span>
                                <input value={editing.hostName || ''} onChange={e => setEditing({ ...editing, hostName: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>Status</span>
                                <select value={editing.status || 'upcoming'} onChange={e => setEditing({ ...editing, status: e.target.value })}>
                                    {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                </select>
                            </label>
                            <label className={styles.field}>
                                <span>Registration URL</span>
                                <input value={editing.registrationUrl || ''} onChange={e => setEditing({ ...editing, registrationUrl: e.target.value })} placeholder="https://..." />
                            </label>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>Recording URL (after event)</span>
                                <input value={editing.recordingUrl || ''} onChange={e => setEditing({ ...editing, recordingUrl: e.target.value })} placeholder="https://..." />
                            </label>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>Description</span>
                                <textarea rows={3} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} />
                            </label>
                        </div>
                        <div className={styles.modalActions}>
                            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Webinar'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead><tr><th>Title</th><th>Date</th><th>Host</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loadingData ? (
                            <tr><td colSpan={5} className={styles.emptyRow}>Loading...</td></tr>
                        ) : webinars.length === 0 ? (
                            <tr><td colSpan={5} className={styles.emptyRow}>No webinars yet. Create one!</td></tr>
                        ) : webinars.map(w => (
                            <tr key={w.id}>
                                <td style={{ fontWeight: 600 }}>{w.title}</td>
                                <td style={{ fontSize: '0.85rem' }}>{formatDate(w.date)}</td>
                                <td>{w.hostName || '—'}</td>
                                <td><span className={`${styles.badge} ${w.status === 'live' ? styles.diffHard : w.status === 'upcoming' ? styles.diffMedium : styles.diffEasy}`}>{w.status}</span></td>
                                <td className={styles.actions}>
                                    <button className={styles.editBtn} onClick={() => setEditing({ ...w })}>Edit</button>
                                    <button className={styles.deleteBtn} onClick={() => handleDelete(w.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
