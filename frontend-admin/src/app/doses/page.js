'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import styles from './content.module.css';

export default function DosesPage() {
    const { isAuthenticated, loading } = useAdminAuth();
    const router = useRouter();
    const [doses, setDoses] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [editing, setEditing] = useState(null); // dose object being edited
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/'); }, [loading, isAuthenticated, router]);

    const fetchDoses = useCallback(async () => {
        try {
            const data = await api.get('/v1/admin/doses');
            setDoses(data.doses || []);
        } catch (err) { console.error(err); }
        finally { setLoadingData(false); }
    }, []);

    useEffect(() => { if (isAuthenticated) fetchDoses(); }, [isAuthenticated, fetchDoses]);

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

    async function handleSave() {
        setSaving(true);
        try {
            if (editing.id) {
                const { id, ...data } = editing;
                await api.patch(`/v1/admin/doses/${id}`, data);
                showToast('Dose updated!');
            } else {
                await api.post('/v1/admin/doses', editing);
                showToast('Dose created!');
            }
            setEditing(null);
            fetchDoses();
        } catch (err) { showToast('Error: ' + err.message); }
        finally { setSaving(false); }
    }

    async function handleDelete(id) {
        if (!confirm('Delete this dose? This cannot be undone.')) return;
        try {
            await api.delete(`/v1/admin/doses/${id}`);
            showToast('Dose deleted');
            fetchDoses();
        } catch (err) { showToast('Error: ' + err.message); }
    }

    if (loading || !isAuthenticated) return null;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Daily Doses' }]}>
            {toast && <div className={styles.toast}>{toast}</div>}

            <div className={styles.header}>
                <h1 className={styles.title}>Daily Doses</h1>
                <button className="btn-primary" onClick={() => setEditing({ dayNumber: '', title: '', category: '', message: '', educationalParagraph: '', bannerQuestion: '', emailSubject: '', emailMessage: '', isActive: true })}>
                    + New Dose
                </button>
            </div>

            {editing && (
                <div className={styles.modal}>
                    <div className={styles.modalCard}>
                        <h2 className={styles.modalTitle}>{editing.id ? 'Edit Dose' : 'New Dose'}</h2>
                        <div className={styles.formGrid}>
                            <label className={styles.field}>
                                <span>Day Number</span>
                                <input type="number" value={editing.dayNumber || ''} onChange={e => setEditing({ ...editing, dayNumber: parseInt(e.target.value) || '' })} />
                            </label>
                            <label className={styles.field}>
                                <span>Title</span>
                                <input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>Category</span>
                                <input value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="e.g. nutrition" />
                            </label>
                            <label className={styles.field}>
                                <span>Active</span>
                                <select value={editing.isActive ? 'true' : 'false'} onChange={e => setEditing({ ...editing, isActive: e.target.value === 'true' })}>
                                    <option value="true">Yes</option>
                                    <option value="false">No</option>
                                </select>
                            </label>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>Message</span>
                                <textarea rows={3} value={editing.message || ''} onChange={e => setEditing({ ...editing, message: e.target.value })} />
                            </label>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>Educational Paragraph</span>
                                <textarea rows={4} value={editing.educationalParagraph || ''} onChange={e => setEditing({ ...editing, educationalParagraph: e.target.value })} />
                            </label>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>Banner Question</span>
                                <input value={editing.bannerQuestion || ''} onChange={e => setEditing({ ...editing, bannerQuestion: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>Email Subject</span>
                                <input value={editing.emailSubject || ''} onChange={e => setEditing({ ...editing, emailSubject: e.target.value })} />
                            </label>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>Email Message</span>
                                <textarea rows={3} value={editing.emailMessage || ''} onChange={e => setEditing({ ...editing, emailMessage: e.target.value })} />
                            </label>
                        </div>
                        <div className={styles.modalActions}>
                            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSave} disabled={saving}>
                                {saving ? 'Saving...' : 'Save Dose'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Day</th>
                            <th>Title</th>
                            <th>Category</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loadingData ? (
                            <tr><td colSpan={5} className={styles.emptyRow}>Loading...</td></tr>
                        ) : doses.length === 0 ? (
                            <tr><td colSpan={5} className={styles.emptyRow}>No doses yet. Create one!</td></tr>
                        ) : doses.map(dose => (
                            <tr key={dose.id}>
                                <td className={styles.dayNum}>{dose.dayNumber}</td>
                                <td>{dose.title}</td>
                                <td><span className={styles.badge}>{dose.category}</span></td>
                                <td><span className={dose.isActive ? styles.statusActive : styles.statusInactive}>{dose.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td className={styles.actions}>
                                    <button className={styles.editBtn} onClick={() => setEditing({ ...dose })}>Edit</button>
                                    <button className={styles.deleteBtn} onClick={() => handleDelete(dose.id)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
