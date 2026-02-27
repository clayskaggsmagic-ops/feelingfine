'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/lib/useAdminAuth';
import { api } from '@/lib/api';
import AdminLayout from '@/components/AdminLayout';
import styles from '../doses/content.module.css';

export default function SettingsPage() {
    const { isAuthenticated, loading } = useAdminAuth();
    const router = useRouter();
    const [settings, setSettings] = useState({});
    const [loadingData, setLoadingData] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');
    const [newPasscode, setNewPasscode] = useState('');
    const [confirmPasscode, setConfirmPasscode] = useState('');

    // Day simulation state
    const [dayOffset, setDayOffsetState] = useState(0);
    const [simulatedDate, setSimulatedDate] = useState('');
    const [advancing, setAdvancing] = useState(false);

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/'); }, [loading, isAuthenticated, router]);

    const fetchSettings = useCallback(async () => {
        try {
            const data = await api.get('/v1/admin/settings');
            setSettings(data.settings || {});
        } catch (err) { console.error(err); }
        finally { setLoadingData(false); }
    }, []);

    const fetchDayOffset = useCallback(async () => {
        try {
            const data = await api.get('/v1/admin/dev/day-offset');
            setDayOffsetState(data.dayOffset);
            setSimulatedDate(data.simulatedDate);
        } catch (err) { console.error('[settings] Error fetching day offset:', err); }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchSettings();
            fetchDayOffset();
        }
    }, [isAuthenticated, fetchSettings, fetchDayOffset]);

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

    async function handleSave() {
        setSaving(true);
        try {
            const updates = { ...settings };
            delete updates.id;
            delete updates.adminPasscode;
            await api.patch('/v1/admin/settings', updates);
            showToast('Settings saved!');
        } catch (err) { showToast('Error: ' + err.message); }
        finally { setSaving(false); }
    }

    async function handlePasscodeChange() {
        if (!newPasscode || newPasscode.length < 6) {
            showToast('Passcode must be at least 6 characters');
            return;
        }
        if (newPasscode !== confirmPasscode) {
            showToast('Passcodes do not match');
            return;
        }
        setSaving(true);
        try {
            await api.patch('/v1/admin/settings', { newPasscode });
            showToast('Admin passcode updated!');
            setNewPasscode('');
            setConfirmPasscode('');
        } catch (err) { showToast('Error: ' + err.message); }
        finally { setSaving(false); }
    }

    async function handleDayChange(newOffset) {
        setAdvancing(true);
        try {
            const data = await api.post('/v1/admin/dev/day-offset', { dayOffset: newOffset });
            setDayOffsetState(data.dayOffset);
            setSimulatedDate(data.simulatedDate);
            if (data.emailTriggered) {
                showToast(`Day ${newOffset > 0 ? '+' : ''}${newOffset} — email sent`);
            }
        } catch (err) { showToast('Error: ' + err.message); }
        finally { setAdvancing(false); }
    }

    async function handleDayReset() {
        setAdvancing(true);
        try {
            const data = await api.delete('/v1/admin/dev/day-offset');
            setDayOffsetState(data.dayOffset);
            setSimulatedDate(data.simulatedDate);
            showToast('Reset to live calendar');
        } catch (err) { showToast('Error: ' + err.message); }
        finally { setAdvancing(false); }
    }

    function formatSimDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' });
    }

    if (loading || !isAuthenticated) return null;

    return (
        <AdminLayout breadcrumbs={[{ label: 'Settings' }]}>
            {toast && <div className={styles.toast}>{toast}</div>}

            <div className={styles.header}>
                <h1 className={styles.title}>Settings</h1>
                <button className="btn-primary" onClick={handleSave} disabled={saving || loadingData}>
                    {saving ? 'Saving...' : 'Save Settings'}
                </button>
            </div>

            {loadingData ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                    {/* General */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>General</h2>
                        <label className={styles.field} style={{ marginBottom: '1rem' }}>
                            <span>Welcome Message</span>
                            <textarea rows={3} value={settings.welcomeMessage || ''} onChange={e => setSettings({ ...settings, welcomeMessage: e.target.value })} />
                        </label>
                        <label className={styles.field} style={{ marginBottom: '1rem' }}>
                            <span>Program Length (days)</span>
                            <input type="number" value={settings.programLength || 42} onChange={e => setSettings({ ...settings, programLength: parseInt(e.target.value) || 42 })} />
                        </label>
                        <label className={styles.field}>
                            <span>Maintenance Mode</span>
                            <select value={settings.maintenanceMode ? 'true' : 'false'} onChange={e => setSettings({ ...settings, maintenanceMode: e.target.value === 'true' })}>
                                <option value="false">Off</option>
                                <option value="true">On — Users see maintenance page</option>
                            </select>
                        </label>
                    </div>

                    {/* Email */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Email</h2>
                        <label className={styles.field} style={{ marginBottom: '1rem' }}>
                            <span>Daily Email Send Time</span>
                            <input type="time" value={settings.emailSendTime || '07:00'} onChange={e => setSettings({ ...settings, emailSendTime: e.target.value })} />
                        </label>
                        <label className={styles.field}>
                            <span>Timezone</span>
                            <select value={settings.timezone || 'America/New_York'} onChange={e => setSettings({ ...settings, timezone: e.target.value })}>
                                <option value="America/New_York">Eastern (ET)</option>
                                <option value="America/Chicago">Central (CT)</option>
                                <option value="America/Denver">Mountain (MT)</option>
                                <option value="America/Los_Angeles">Pacific (PT)</option>
                                <option value="UTC">UTC</option>
                            </select>
                        </label>
                    </div>

                    {/* Weekly Challenge */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Weekly Challenge</h2>
                        <label className={styles.field} style={{ marginBottom: '1rem' }}>
                            <span>Challenge Text</span>
                            <textarea rows={2} value={settings.weeklyChallenge || ''} onChange={e => setSettings({ ...settings, weeklyChallenge: e.target.value })} placeholder="e.g. Drink 8 glasses of water every day this week" />
                        </label>
                        <label className={styles.field}>
                            <span>Cornerstone Focus</span>
                            <select value={settings.weeklyChallengeCornerstoneId || ''} onChange={e => setSettings({ ...settings, weeklyChallengeCornerstoneId: e.target.value })}>
                                <option value="">None</option>
                                <option value="nutrition">Nutrition</option>
                                <option value="movement">Movement</option>
                                <option value="sleep">Sleep</option>
                                <option value="stress">Stress Management</option>
                                <option value="social">Social Connection</option>
                                <option value="brain">Brain Health</option>
                                <option value="aging">Healthy Aging</option>
                            </select>
                        </label>
                    </div>

                    {/* Admin Passcode */}
                    <div className="card" style={{ padding: '1.5rem' }}>
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Admin Passcode</h2>
                        <label className={styles.field} style={{ marginBottom: '0.75rem' }}>
                            <span>New Passcode</span>
                            <input type="password" value={newPasscode} onChange={e => setNewPasscode(e.target.value)} placeholder="Min 6 characters" />
                        </label>
                        <label className={styles.field} style={{ marginBottom: '0.75rem' }}>
                            <span>Confirm Passcode</span>
                            <input type="password" value={confirmPasscode} onChange={e => setConfirmPasscode(e.target.value)} />
                        </label>
                        <button className="btn-primary" onClick={handlePasscodeChange} disabled={saving || !newPasscode} style={{ width: '100%' }}>
                            Update Passcode
                        </button>
                    </div>

                    {/* ── Developer Tools: Day Simulation ── */}
                    <div className="card" style={{
                        padding: '1.5rem',
                        border: '2px dashed var(--border, #333)',
                        gridColumn: '1 / -1',
                        background: 'var(--surface-raised, #1a1a2e)',
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                                Developer Tools — Day Simulation
                            </h2>
                            <span style={{
                                fontSize: '0.7rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                padding: '0.2rem 0.6rem',
                                borderRadius: '4px',
                                background: dayOffset === 0 ? 'var(--success, #22c55e)' : 'var(--warning, #f59e0b)',
                                color: '#000',
                                fontWeight: 700,
                            }}>
                                {dayOffset === 0 ? 'LIVE' : 'SIMULATED'}
                            </span>
                        </div>

                        <p style={{ fontSize: '0.85rem', opacity: 0.7, marginBottom: '1rem' }}>
                            Advance or rewind the calendar day. Content, tracking, emails, and progress will reflect the simulated date. The daily email fires automatically on each advance.
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <button
                                onClick={() => handleDayChange(dayOffset - 1)}
                                disabled={advancing}
                                style={{
                                    width: '44px', height: '44px', borderRadius: '8px',
                                    border: '1px solid var(--border, #333)',
                                    background: 'var(--surface, #111)',
                                    color: 'var(--text, #fff)',
                                    fontSize: '1.4rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                                aria-label="Go back one day"
                            >
                                &minus;
                            </button>

                            <div style={{ textAlign: 'center', minWidth: '180px' }}>
                                <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>
                                    {simulatedDate ? formatSimDate(simulatedDate) : '...'}
                                </div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '0.2rem' }}>
                                    {dayOffset === 0
                                        ? 'Today (live calendar)'
                                        : `${dayOffset > 0 ? '+' : ''}${dayOffset} day${Math.abs(dayOffset) === 1 ? '' : 's'} from today`}
                                </div>
                            </div>

                            <button
                                onClick={() => handleDayChange(dayOffset + 1)}
                                disabled={advancing}
                                style={{
                                    width: '44px', height: '44px', borderRadius: '8px',
                                    border: '1px solid var(--border, #333)',
                                    background: 'var(--surface, #111)',
                                    color: 'var(--text, #fff)',
                                    fontSize: '1.4rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}
                                aria-label="Advance one day"
                            >
                                +
                            </button>

                            {dayOffset !== 0 && (
                                <button
                                    onClick={handleDayReset}
                                    disabled={advancing}
                                    style={{
                                        padding: '0.5rem 1rem', borderRadius: '8px',
                                        border: '1px solid var(--border, #333)',
                                        background: 'transparent',
                                        color: 'var(--text, #fff)',
                                        fontSize: '0.85rem', cursor: 'pointer',
                                        marginLeft: 'auto',
                                    }}
                                >
                                    Reset to Today
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
}
