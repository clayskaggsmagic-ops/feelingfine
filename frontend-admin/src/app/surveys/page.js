'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import styles from '../doses/content.module.css';

const QUESTION_TYPES = ['single_choice', 'multiple_choice', 'scale', 'text'];

export default function SurveysPage() {
    const { isAuthenticated, loading } = useAdminAuth();
    const router = useRouter();
    const [surveys, setSurveys] = useState([]);
    const [loadingData, setLoadingData] = useState(true);
    const [editing, setEditing] = useState(null);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [previewSurvey, setPreviewSurvey] = useState(null);

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/'); }, [loading, isAuthenticated, router]);

    const fetchSurveys = useCallback(async () => {
        try {
            const data = await api.get('/v1/admin/surveys');
            setSurveys(data.surveys || []);
        } catch (err) { console.error(err); }
        finally { setLoadingData(false); }
    }, []);

    useEffect(() => { if (isAuthenticated) fetchSurveys(); }, [isAuthenticated, fetchSurveys]);

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

    function parseQuestions(survey) {
        try { return JSON.parse(survey.questions || '[]'); }
        catch { return []; }
    }

    function startEditing(survey) {
        setEditing({
            ...survey,
            _questions: parseQuestions(survey),
        });
    }

    function startNew() {
        setEditing({
            surveyId: '',
            title: '',
            triggerType: 'onboarding',
            triggerDay: 0,
            isActive: true,
            _questions: [{ id: Date.now(), type: 'single_choice', text: '', options: [''], required: true }],
        });
    }

    function updateQuestion(idx, field, value) {
        const qs = [...editing._questions];
        qs[idx] = { ...qs[idx], [field]: value };
        setEditing({ ...editing, _questions: qs });
    }

    function addOption(qIdx) {
        const qs = [...editing._questions];
        qs[qIdx].options = [...(qs[qIdx].options || []), ''];
        setEditing({ ...editing, _questions: qs });
    }

    function updateOption(qIdx, oIdx, value) {
        const qs = [...editing._questions];
        qs[qIdx].options = [...qs[qIdx].options];
        qs[qIdx].options[oIdx] = value;
        setEditing({ ...editing, _questions: qs });
    }

    function removeOption(qIdx, oIdx) {
        const qs = [...editing._questions];
        qs[qIdx].options = qs[qIdx].options.filter((_, i) => i !== oIdx);
        setEditing({ ...editing, _questions: qs });
    }

    function addQuestion() {
        setEditing({
            ...editing,
            _questions: [...editing._questions, { id: Date.now(), type: 'single_choice', text: '', options: [''], required: true }],
        });
    }

    function removeQuestion(idx) {
        setEditing({ ...editing, _questions: editing._questions.filter((_, i) => i !== idx) });
    }

    function moveQuestion(idx, dir) {
        const qs = [...editing._questions];
        const newIdx = idx + dir;
        if (newIdx < 0 || newIdx >= qs.length) return;
        [qs[idx], qs[newIdx]] = [qs[newIdx], qs[idx]];
        setEditing({ ...editing, _questions: qs });
    }

    async function handleSave() {
        setSaving(true);
        const { _questions, id, ...rest } = editing;
        const data = { ...rest, questions: JSON.stringify(_questions) };
        try {
            if (id) {
                await api.patch(`/v1/admin/surveys/${id}`, data);
                showToast('Survey updated!');
            } else {
                await api.post('/v1/admin/surveys', data);
                showToast('Survey created!');
            }
            setEditing(null);
            fetchSurveys();
        } catch (err) { showToast('Error: ' + err.message); }
        finally { setSaving(false); }
    }

    if (loading || !isAuthenticated) return null;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Surveys' }]}>
            {toast && <div className={styles.toast}>{toast}</div>}

            <div className={styles.header}>
                <h1 className={styles.title}>Surveys</h1>
                <button className="btn-primary" onClick={startNew}>+ New Survey</button>
            </div>

            {/* Preview Modal */}
            {previewSurvey && (
                <div className={styles.modal} onClick={() => setPreviewSurvey(null)}>
                    <div className={styles.modalCard} onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                        <h2 className={styles.modalTitle}>Preview: {previewSurvey.title}</h2>
                        {parseQuestions(previewSurvey).map((q, i) => (
                            <div key={i} style={{ marginBottom: '1.25rem', padding: '1rem', background: '#f8f9fa', borderRadius: '10px' }}>
                                <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{i + 1}. {q.text} {q.required && <span style={{ color: 'var(--admin-error)' }}>*</span>}</p>
                                {q.type === 'single_choice' || q.type === 'multiple_choice' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                                        {(q.options || []).map((o, j) => (
                                            <label key={j} style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <input type={q.type === 'single_choice' ? 'radio' : 'checkbox'} name={`preview-q${i}`} disabled /> {o}
                                            </label>
                                        ))}
                                    </div>
                                ) : q.type === 'scale' ? (
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {Array.from({ length: (q.scaleMax || 10) - (q.scaleMin || 1) + 1 }, (_, k) => (q.scaleMin || 1) + k).map(v => (
                                            <span key={v} style={{ width: '32px', height: '32px', border: '1px solid var(--admin-border)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem' }}>{v}</span>
                                        ))}
                                    </div>
                                ) : (
                                    <input disabled placeholder="Free text answer..." style={{ width: '100%' }} />
                                )}
                            </div>
                        ))}
                        <button className="btn-secondary" onClick={() => setPreviewSurvey(null)} style={{ width: '100%' }}>Close Preview</button>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editing && (
                <div className={styles.modal}>
                    <div className={styles.modalCard} style={{ maxWidth: '800px' }}>
                        <h2 className={styles.modalTitle}>{editing.id ? 'Edit Survey' : 'New Survey'}</h2>
                        <div className={styles.formGrid}>
                            <label className={styles.field}>
                                <span>Survey ID</span>
                                <input value={editing.surveyId || ''} onChange={e => setEditing({ ...editing, surveyId: e.target.value })} placeholder="e.g. onboarding" />
                            </label>
                            <label className={styles.field}>
                                <span>Title</span>
                                <input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} />
                            </label>
                            <label className={styles.field}>
                                <span>Trigger Type</span>
                                <select value={editing.triggerType || 'onboarding'} onChange={e => setEditing({ ...editing, triggerType: e.target.value })}>
                                    <option value="onboarding">Onboarding</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="milestone">Milestone</option>
                                    <option value="manual">Manual</option>
                                </select>
                            </label>
                            <label className={styles.field}>
                                <span>Trigger Day</span>
                                <input type="number" value={editing.triggerDay ?? 0} onChange={e => setEditing({ ...editing, triggerDay: parseInt(e.target.value) || 0 })} />
                            </label>
                        </div>

                        <h3 style={{ marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: '1.05rem', fontWeight: 700 }}>Questions</h3>

                        {editing._questions.map((q, i) => (
                            <div key={q.id || i} style={{ padding: '1rem', background: '#f8f9fa', borderRadius: '10px', marginBottom: '0.75rem', border: '1px solid var(--admin-border)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--admin-text-secondary)' }}>Q{i + 1}</span>
                                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                                        <button style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'white', border: '1px solid var(--admin-border)', borderRadius: '4px' }} onClick={() => moveQuestion(i, -1)}>↑</button>
                                        <button style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'white', border: '1px solid var(--admin-border)', borderRadius: '4px' }} onClick={() => moveQuestion(i, 1)}>↓</button>
                                        <button style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', background: 'rgba(231,76,60,0.08)', color: 'var(--admin-error)', border: 'none', borderRadius: '4px' }} onClick={() => removeQuestion(i)}>✕</button>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <input placeholder="Question text" value={q.text || ''} onChange={e => updateQuestion(i, 'text', e.target.value)} />
                                    <select value={q.type} onChange={e => updateQuestion(i, 'type', e.target.value)} style={{ width: '140px' }}>
                                        {QUESTION_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                                    </select>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem' }}>
                                        <input type="checkbox" checked={q.required !== false} onChange={e => updateQuestion(i, 'required', e.target.checked)} /> Req
                                    </label>
                                </div>
                                {(q.type === 'single_choice' || q.type === 'multiple_choice') && (
                                    <div style={{ marginTop: '0.5rem' }}>
                                        {(q.options || []).map((opt, j) => (
                                            <div key={j} style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.35rem' }}>
                                                <input value={opt} onChange={e => updateOption(i, j, e.target.value)} placeholder={`Option ${j + 1}`} style={{ flex: 1 }} />
                                                <button onClick={() => removeOption(i, j)} style={{ padding: '0.35rem 0.5rem', fontSize: '0.75rem', background: 'rgba(231,76,60,0.08)', color: 'var(--admin-error)', border: 'none', borderRadius: '4px' }}>✕</button>
                                            </div>
                                        ))}
                                        <button onClick={() => addOption(i)} style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', background: 'white', border: '1px solid var(--admin-border)', borderRadius: '6px', marginTop: '0.25rem' }}>+ Option</button>
                                    </div>
                                )}
                                {q.type === 'scale' && (
                                    <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                        <label className={styles.field} style={{ flex: 1 }}><span>Min</span><input type="number" value={q.scaleMin || 1} onChange={e => updateQuestion(i, 'scaleMin', parseInt(e.target.value))} /></label>
                                        <label className={styles.field} style={{ flex: 1 }}><span>Max</span><input type="number" value={q.scaleMax || 10} onChange={e => updateQuestion(i, 'scaleMax', parseInt(e.target.value))} /></label>
                                    </div>
                                )}
                            </div>
                        ))}

                        <button onClick={addQuestion} className="btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>+ Add Question</button>

                        <div className={styles.modalActions}>
                            <button className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Survey'}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className={styles.tableWrap}>
                <table className={styles.table}>
                    <thead><tr><th>Survey ID</th><th>Title</th><th>Trigger</th><th>Questions</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {loadingData ? (
                            <tr><td colSpan={6} className={styles.emptyRow}>Loading...</td></tr>
                        ) : surveys.length === 0 ? (
                            <tr><td colSpan={6} className={styles.emptyRow}>No surveys yet.</td></tr>
                        ) : surveys.map(s => (
                            <tr key={s.id}>
                                <td className={styles.dayNum}>{s.surveyId}</td>
                                <td>{s.title}</td>
                                <td><span className={styles.badge}>{s.triggerType}{s.triggerDay ? ` (day ${s.triggerDay})` : ''}</span></td>
                                <td>{parseQuestions(s).length}</td>
                                <td><span className={s.isActive ? styles.statusActive : styles.statusInactive}>{s.isActive ? 'Active' : 'Inactive'}</span></td>
                                <td className={styles.actions}>
                                    <button className={styles.editBtn} onClick={() => setPreviewSurvey(s)}>Preview</button>
                                    <button className={styles.editBtn} onClick={() => startEditing(s)}>Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </AdminLayout>
    );
}
