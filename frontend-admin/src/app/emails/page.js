'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import styles from '../doses/content.module.css';

export default function EmailsPage() {
    const { isAuthenticated, loading } = useAdminAuth();
    const router = useRouter();
    const [templates, setTemplates] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [testEmail, setTestEmail] = useState('');
    const [showPreview, setShowPreview] = useState(false);

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/'); }, [loading, isAuthenticated, router]);

    const fetchTemplates = useCallback(async () => {
        try {
            const data = await api.get('/v1/admin/email-templates');
            setTemplates(data.templates || []);
        } catch (err) { console.error(err); }
        finally { setLoadingData(false); }
    }, []);

    useEffect(() => { if (isAuthenticated) fetchTemplates(); }, [isAuthenticated, fetchTemplates]);

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

    async function handleSave() {
        if (!editing?.id) return;
        setSaving(true);
        try {
            const { id, ...data } = editing;
            await api.patch(`/v1/admin/email-templates/${id}`, data);
            showToast('Template saved!');
            setEditing(null);
            fetchTemplates();
        } catch (err) { showToast('Error: ' + err.message); }
        finally { setSaving(false); }
    }

    async function handleSendTest() {
        if (!testEmail || !editing) return;
        try {
            await api.post('/v1/admin/email/send-test', { templateId: editing.templateId, testEmail });
            showToast(`Test email queued to ${testEmail}`);
        } catch (err) { showToast('Error: ' + err.message); }
    }

    async function handleSendNow(templateId) {
        if (!confirm('Send this email to ALL active users now? This cannot be undone.')) return;
        try {
            await api.post('/v1/admin/email/send-now', { templateId });
            showToast('Email send queued!');
        } catch (err) { showToast('Error: ' + err.message); }
    }

    if (loading || !isAuthenticated) return null;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Emails' }]}>
            {toast && <div className={styles.toast}>{toast}</div>}

            <div className={styles.header}>
                <h1 className={styles.title}>Email Templates</h1>
            </div>

            {editing && (
                <div className={styles.modal}>
                    <div className={styles.modalCard} style={{ maxWidth: '800px' }}>
                        <h2 className={styles.modalTitle}>Edit: {editing.templateId}</h2>
                        <div className={styles.formGrid}>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>Subject Line</span>
                                <input value={editing.subject || ''} onChange={e => setEditing({ ...editing, subject: e.target.value })} placeholder="Your Daily Dose — Day {{day}}" />
                            </label>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>HTML Content</span>
                                <textarea rows={10} value={editing.htmlContent || ''} onChange={e => setEditing({ ...editing, htmlContent: e.target.value })} style={{ fontFamily: 'Menlo, monospace', fontSize: '0.85rem' }} />
                            </label>
                            <label className={`${styles.field} ${styles.fieldFull}`}>
                                <span>Plain Text Content</span>
                                <textarea rows={6} value={editing.plainTextContent || ''} onChange={e => setEditing({ ...editing, plainTextContent: e.target.value })} style={{ fontFamily: 'Menlo, monospace', fontSize: '0.85rem' }} />
                            </label>
                        </div>

                        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '10px' }}>
                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-secondary)', marginBottom: '0.5rem' }}>VARIABLES: {'{{name}}'}, {'{{day}}'}</p>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="test@example.com" style={{ flex: 1 }} />
                                <button className="btn-secondary" onClick={handleSendTest} disabled={!testEmail}>📤 Send Test</button>
                                <button className="btn-secondary" onClick={() => setShowPreview(!showPreview)}>👁 Preview</button>
                            </div>
                        </div>

                        {showPreview && editing.htmlContent && (
                            <div style={{ marginTop: '1rem', border: '1px solid var(--admin-border)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ padding: '0.5rem 1rem', background: '#f8f9fa', fontSize: '0.8rem', fontWeight: 600, color: 'var(--admin-text-secondary)' }}>PREVIEW</div>
                                <div style={{ padding: '1rem' }} dangerouslySetInnerHTML={{ __html: (editing.htmlContent || '').replace(/\{\{name\}\}/g, 'Jane Doe').replace(/\{\{day\}\}/g, '5') }} />
                            </div>
                        )}

                        <div className={styles.modalActions}>
                            <button className="btn-secondary" onClick={() => { setEditing(null); setShowPreview(false); }}>Cancel</button>
                            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Template'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead><tr><th>Template</th><th>Subject</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loadingData ? (
                            <tr><td colSpan={3} className={styles.emptyRow}>Loading...</td></tr>
                        ) : templates.length === 0 ? (
                            <tr><td colSpan={3} className={styles.emptyRow}>No email templates found.</td></tr>
                        ) : templates.map(t => (
                            <tr key={t.id}>
                                <td className={styles.dayNum}>{t.templateId}</td>
                                <td>{t.subject || '—'}</td>
                                <td className={styles.actions}>
                                    <button className={styles.editBtn} onClick={() => setEditing({ ...t })}>Edit</button>
                                    <button className={styles.editBtn} onClick={() => handleSendNow(t.templateId)}>🚀 Send Now</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
