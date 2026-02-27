'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { auth } from '@/lib/firebase';
import { sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import styles from './settings.module.css';

export default function SettingsPage() {
    const { user, profile, loading } = useAuth();
    const router = useRouter();
    const [displayName, setDisplayName] = useState('');
    const [emailOptIn, setEmailOptIn] = useState(true);
    const [fontSizeMultiplier, setFontSizeMultiplier] = useState(1.0);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState('');

    useEffect(() => { if (!loading && !user) router.push('/login'); }, [loading, user, router]);

    useEffect(() => {
        if (profile) {
            setDisplayName(profile.displayName || '');
            setEmailOptIn(profile.emailOptIn !== false);
            setFontSizeMultiplier(profile.fontSizeMultiplier || 1.0);
        }
    }, [profile]);

    // Apply font scaling to document root
    useEffect(() => {
        document.documentElement.style.fontSize = `${fontSizeMultiplier * 100}%`;
        return () => { document.documentElement.style.fontSize = ''; };
    }, [fontSizeMultiplier]);

    function showToast(msg) { setToast(msg); setTimeout(() => setToast(''), 3000); }

    async function handleSave() {
        setSaving(true);
        try {
            await api.patch('/v1/auth/me', { displayName, emailOptIn, fontSizeMultiplier });
            showToast('Settings saved!');
        } catch (err) { showToast('Error: ' + err.message); }
        finally { setSaving(false); }
    }

    async function handlePasswordReset() {
        try {
            await sendPasswordResetEmail(auth, user.email);
            showToast('Password reset email sent!');
        } catch (err) { showToast('Error: ' + err.message); }
    }

    async function handleDownloadData() {
        try {
            const data = await api.get('/v1/auth/me');
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'my-data.json'; a.click();
            URL.revokeObjectURL(url);
            showToast('Data downloaded!');
        } catch (err) { showToast('Error: ' + err.message); }
    }

    async function handleDeleteAccount() {
        if (!confirm('Are you sure you want to delete your account? This will permanently remove all your data and cannot be undone.')) return;
        if (!confirm('This is your FINAL confirmation. Delete your account and all data?')) return;
        try {
            await api.delete('/v1/auth/me');
            await deleteUser(auth.currentUser);
            router.push('/');
        } catch (err) { showToast('Error: ' + err.message); }
    }

    if (loading || !user) return null;

    return (
        <div className={styles.page}>
            {toast && <div className={styles.toast}>{toast}</div>}

            <header className={styles.header}>
                <button onClick={() => router.push('/dashboard')} className={styles.backBtn}>← Dashboard</button>
                <h1 className={styles.title}>Settings</h1>
            </header>

            <div className={styles.grid}>
                {/* Profile */}
                <section className={styles.card}>
                    <h2 className={styles.sectionTitle}>👤 Profile</h2>
                    <label className={styles.field}>
                        <span>Display Name</span>
                        <input value={displayName} onChange={e => setDisplayName(e.target.value)} />
                    </label>
                    <label className={styles.field}>
                        <span>Email</span>
                        <input value={user?.email || ''} disabled style={{ opacity: 0.6 }} />
                    </label>
                    <button className={styles.primaryBtn} onClick={handleSave} disabled={saving} style={{ marginTop: '1rem' }}>
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </section>

                {/* Accessibility */}
                <section className={styles.card}>
                    <h2 className={styles.sectionTitle}>♿ Accessibility</h2>
                    <label className={styles.field}>
                        <span>Font Size</span>
                        <div className={styles.fontScale}>
                            {[1.0, 1.25, 1.5].map(s => (
                                <button key={s} className={`${styles.scaleBtn} ${fontSizeMultiplier === s ? styles.scaleBtnActive : ''}`} onClick={() => { setFontSizeMultiplier(s); }}>
                                    {s}x
                                </button>
                            ))}
                        </div>
                    </label>
                    <p className={styles.hint} style={{ fontSize: `${0.85 * fontSizeMultiplier}rem` }}>
                        Preview: This text scales with your selection.
                    </p>
                </section>

                {/* Notifications */}
                <section className={styles.card}>
                    <h2 className={styles.sectionTitle}>🔔 Notifications</h2>
                    <label className={styles.toggle}>
                        <span>Daily wellness emails</span>
                        <label className={styles.switch}>
                            <input type="checkbox" checked={emailOptIn} onChange={e => setEmailOptIn(e.target.checked)} />
                            <span className={styles.slider}></span>
                        </label>
                    </label>
                    <p className={styles.hint}>{emailOptIn ? 'You will receive daily emails.' : 'You have opted out of emails.'}</p>
                </section>

                {/* Privacy */}
                <section className={styles.card}>
                    <h2 className={styles.sectionTitle}>🔒 Privacy & Account</h2>
                    <button className={styles.secondaryBtn} onClick={handlePasswordReset}>📧 Send Password Reset Email</button>
                    <button className={styles.secondaryBtn} onClick={handleDownloadData} style={{ marginTop: '0.5rem' }}>📥 Download My Data</button>
                    <div className={styles.dangerZone}>
                        <p className={styles.dangerLabel}>Danger Zone</p>
                        <button className={styles.deleteBtn} onClick={handleDeleteAccount}>🗑 Delete My Account</button>
                    </div>
                </section>
            </div>
        </div>
    );
}
