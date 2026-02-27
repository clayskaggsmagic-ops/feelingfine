'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, sendEmailVerification } from 'firebase/auth';
import { app } from '@/lib/firebase';
import styles from './verify.module.css';

export default function VerifyEmailPage() {
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [sent, setSent] = useState(false);
    const router = useRouter();
    const auth = getAuth(app);

    // Check verification status: simple poll, redirect via window.location to avoid React issues
    useEffect(() => {
        // If already verified on mount, redirect immediately
        const user = auth.currentUser;
        if (user?.emailVerified) {
            window.location.href = '/onboarding';
            return;
        }

        // Also store in sessionStorage so we never oscillate
        if (sessionStorage.getItem('ff-email-verified') === 'true') {
            window.location.href = '/onboarding';
            return;
        }

        const interval = setInterval(async () => {
            const u = auth.currentUser;
            if (!u) return;
            try {
                await u.reload();
                if (u.emailVerified) {
                    clearInterval(interval);
                    sessionStorage.setItem('ff-email-verified', 'true');
                    window.location.href = '/onboarding';
                }
            } catch (e) {
                // ignore reload errors, try again next tick
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []); // empty deps — run once on mount, never re-create

    // Cooldown timer for resend
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const handleResend = useCallback(async () => {
        const user = auth.currentUser;
        if (!user) {
            setError('No user found. Please sign up again.');
            return;
        }
        try {
            await sendEmailVerification(user);
            setSent(true);
            setCooldown(60);
            setError('');
        } catch (err) {
            if (err.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please wait a few minutes.');
            } else {
                setError('Failed to send verification email. Please try again.');
            }
        }
    }, [auth]);

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <div className={`card ${styles.card}`}>
                    <div className={styles.icon}>&#9993;</div>
                    <h1 className={styles.title}>Check Your Email</h1>
                    <p className={styles.subtitle}>
                        We sent a verification link to{' '}
                        <strong>{auth.currentUser?.email || 'your email'}</strong>.
                        Click the link to verify your account.
                    </p>

                    <div className={styles.instructions}>
                        <p>1. Open the email from Feeling Fine</p>
                        <p>2. Click the verification link</p>
                        <p>3. Come back here — we'll detect it automatically</p>
                    </div>

                    <div className={styles.spinner} />
                    <p className={styles.waitingText}>Waiting for verification...</p>

                    {error && (
                        <div className={styles.error} role="alert">{error}</div>
                    )}

                    {sent && (
                        <div className={styles.success}>Verification email resent!</div>
                    )}

                    <button
                        className={`btn-primary ${styles.resendBtn}`}
                        onClick={handleResend}
                        disabled={cooldown > 0}
                    >
                        {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Verification Email'}
                    </button>

                    <p className={styles.helpText}>
                        Check your spam folder if you don't see the email.
                    </p>
                </div>
            </div>
        </main>
    );
}
