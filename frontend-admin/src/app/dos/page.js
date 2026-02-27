'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import styles from '../doses/content.module.css';

const CATEGORIES = ['Nutrition', 'Movement', 'Sleep', 'Stress Management', 'Social Connection', 'Brain Health', 'Healthy Aging'];

export default function DosPage() {
    const { isAuthenticated, loading } = useAdminAuth();
    const router = useRouter();
    const [dos, setDos] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');
    const [showBulk, setShowBulk] = useState(false);
    const [bulkText, setBulkText] = useState('');
    const [bulkCategory, setBulkCategory] = useState(CATEGORIES[0]);
    const [bulkDay, setBulkDay] = useState(0);

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/'); }, [loading, isAuthenticated, router]);

    const fetchDos = useCallback(async () => {
        try {
            const data = await api.get('/v1/admin/dos');
            setDos(data.dos || []);
        } catch (err) { console.error(err); }
        finally { setLoadingData(false); }
    }, []);

    useEffect(() => { if (isAuthenticated) fetchDos(); }, [isAuthenticated, fetchDos]);

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

    async function handleSave() {
        setSaving(true);
        try {
            if (editing.id) {
                const { id, ...data } = editing;
                await api.patch(`/v1/admin/dos/${id}`, data);
                showToast('Task updated!');
            } else {
                await api.post('/v1/admin/dos', editing);
                showToast('Task created!');
            }
            setEditing(null);
            fetchDos();
        } catch (err) { showToast('Error: ' + err.message); }
        finally { setSaving(false); }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this task?')) return;
        try {
            await api.delete(`/v1/admin/dos/${id}`);
            showToast('Task deleted');
            fetchDos();
        } catch (err) { showToast('Error: ' + err.message); }
    }

    async function handleBulkImport() {
        const lines = bulkText.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length === 0) return;
        setSaving(true);
        try {
            const items = lines.map(text => ({
                dayNumber: parseInt(bulkDay) || 0,
                category: bulkCategory,
                taskText: text,
                difficulty: 'easy',
                isActive: true,
            }));
            await api.post('/v1/admin/dos/bulk', { items });
            showToast(`${lines.length} tasks imported!`);
            setBulkText('');
            setShowBulk(false);
            fetchDos();
        } catch (err) { showToast('Error: ' + err.message); }
        finally { setSaving(false); }
    }

    const filtered = filterCategory === 'all' ? dos : dos.filter(d => d.category === filterCategory);

    if (loading || !isAuthenticated) return null;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Daily Dos' }]}>
            {toast && <div className={styles.toast}>{toast}</div>}

            <div className={styles.header}>
                <h1 className={styles.title}>Daily Dos ({filtered.length})</h1>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--admin-border)', fontSize: '0.85rem' }}>
                        <option value="all">All Categories</option>
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button className="btn-secondary" onClick={() => setShowBulk(!showBulk)}>📥 Bulk Import</button>
                    <button className="btn-primary" onClick={() => setEditing({ dayNumber: 0, category: CATEGORIES[0], taskText: '', difficulty: 'easy', isActive: true })}>+ New Task</button>
                </div>
            </div>

            {showBulk && (
                <div className={`card ${styles.bulkSection}`} style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
                    <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Bulk Import — One task per line</h3>
                    <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                        <select value={bulkCategory} onChange={e => setBulkCategory(e.target.value)} style={{ flex: 1 }}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="number" placeholder="Day #" value={bulkDay} onChange={e => setBulkDay(e.target.value)} style={{ width: '100px' }} />
                    </div>
                    <textarea className={styles.bulkTextarea} value={bulkText} onChange={e => setBulkText(e.target.value)} placeholder="Drink 8 glasses of water&#10;Eat a green vegetable&#10;Take a 10-minute walk" style={{ width: '100%' }} />
                    <button className="btn-primary" onClick={handleBulkImport} disabled={saving || !bulkText.trim()}>
                        {saving ? 'Importing...' : `Import ${bulkText.split('\n').filter(l => l.trim()).length} tasks`}
                    </button>
                </div>
            )}

            {editing && (
                <div className={styles.modal}>
                    <div className={styles.modalCard}>
                        <h2 className={styles.modalTitle}>{editing.id ? 'Edit Task' : 'New Task'}</h2>
                        <div className={styles.formGrid}>
                            <label className={styles.field}>
                                <span>Day Number</span>
                                <input type="number" value={editing.dayNumber ?? ''} onChange={e => setEditing({ ...editing, dayNumber: parseInt(e.target.value) || 0 })} />
                            </label>
                            <label className={styles.field}>
                                <span>Category</span>
                                <select value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })}>
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </label>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>Task Text</span>
                                <textarea rows={2} value={editing.taskText || ''} onChange={e => setEditing({ ...editing, taskText: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>Difficulty</span>
                                <select value={editing.difficulty || 'easy'} onChange={e => setEditing({ ...editing, difficulty: e.target.value })}>
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </label>
                            <label className={styles.field}>
                                <span>Active</span>
                                <select value={editing.isActive ? 'true' : 'false'} onChange={e => setEditing({ ...editing, isActive: e.target.value === 'true' })}>
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                </select>
                            </label>
                        </div>
                        <div className={styles.modalActions}>
                            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Task'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead><tr><th>Day</th><th>Task</th><th>Category</th><th>Difficulty</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loadingData ? (
                            <tr><td colSpan={6} className={styles.emptyRow}>Loading...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={6} className={styles.emptyRow}>No tasks found.</td></tr>
                        ) : filtered.map(d => (
                            <tr key={d.id}>
                                <td className={styles.dayNum}>{d.dayNumber}</td>
                                <td>{d.taskText}</td>
                                <td><span className={styles.badge}>{d.category}</span></td>
                                <td><span className={`${styles.badge} ${d.difficulty === 'easy' ? styles.diffEasy : d.difficulty === 'medium' ? styles.diffMedium : styles.diffHard}`}>{d.difficulty}</span></td>
                                <td><span className={d.isActive ? styles.statusActive : styles.statusInactive}>{d.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td className={styles.actions}>
                                    <button className={styles.editBtn} onClick={() => setEditing({ ...d })}>Edit</button>
                                    <button className={styles.deleteBtn} onClick={() => handleDelete(d.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
