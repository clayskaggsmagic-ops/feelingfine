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

    useEffect(() => { if (!loading && !isAuthenticated) router.push('/'); }, [loading, isAuthenticated, router]);

    const fetchSettings = useCallback(async () => {
        try {
            const data = await api.get('/v1/admin/settings');
            setSettings(data.settings || {});
        } catch (err) { console.error(err); }
        finally { setLoadingData(false); }
    }, []);

    useEffect(() => { if (isAuthenticated) fetchSettings(); }, [isAuthenticated, fetchSettings]);

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
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>📋 General</h2>
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
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>📧 Email</h2>
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
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>🏆 Weekly Challenge</h2>
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
                        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>🔒 Admin Passcode</h2>
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
                </div>
            )}
        </AdminLayout>
    );
}
