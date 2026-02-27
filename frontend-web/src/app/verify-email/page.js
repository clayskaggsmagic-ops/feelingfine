'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { getAuth, sendEmailVerification } from 'firebase/auth';
import { app } from '@/lib/firebase';
import styles from './verify.module.css';

export default function VerifyEmailPage() {
    const [status, setStatus] = useState('waiting'); // waiting | sent | verified | error
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const router = useRouter();
    const auth = getAuth(app);

    const verifiedRef = useRef(false);

    // Poll for email verification every 3 seconds
    useEffect(() => {
        if (verifiedRef.current) return; // Already verified, don't poll

        const interval = setInterval(async () => {
            if (verifiedRef.current) {
                clearInterval(interval);
                return;
            }

            const user = auth.currentUser;
            if (!user) return;

            try {
                await user.reload();
            } catch {
                return; // Reload failed, try again next interval
            }

            if (user.emailVerified && !verifiedRef.current) {
                verifiedRef.current = true; // Lock — never go back
                setStatus('verified');
                clearInterval(interval);
                setTimeout(() => router.push('/onboarding'), 1500);
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [auth, router]);

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
            setStatus('sent');
            setCooldown(60); // 60 second cooldown between resends
            setError('');
        } catch (err) {
            console.error('[verify-email] Resend error:', err);
            if (err.code === 'auth/too-many-requests') {
                setError('Too many attempts. Please wait a few minutes.');
            } else {
                setError('Failed to send verification email. Please try again.');
            }
        }
    }, [auth]);

    if (status === 'verified') {
        return (
            <main className={styles.page}>
                <div className={styles.container}>
                    <div className={`card ${styles.card}`}>
                        <div className={styles.icon}>&#10003;</div>
                        <h1 className={styles.title}>Email Verified</h1>
                        <p className={styles.subtitle}>Taking you to onboarding...</p>
                    </div>
                </div>
            </main>
        );
    }

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

                    {status === 'sent' && (
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
