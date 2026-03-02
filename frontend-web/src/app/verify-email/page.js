'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuth, sendEmailVerification } from 'firebase/auth';
import { Suspense } from 'react';
import { app } from '@/lib/firebase';
import styles from './verify.module.css';

function VerifyEmailContent() {
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [sent, setSent] = useState(false);
    const [verified, setVerified] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const auth = getAuth(app);

    // Detect if this is the tab opened from the email link.
    // Firebase's verification email redirects to our continueUrl with mode/oobCode params.
    // The original signup tab navigates here with NO params.
    const isNewTab = searchParams.has('mode') || searchParams.has('oobCode') || searchParams.has('lang');

    // Once verified, show success briefly then redirect (only on original tab)
    useEffect(() => {
        if (!verified || isNewTab) return;
        const timer = setTimeout(() => {
            window.location.href = '/onboarding';
        }, 1500);
        return () => clearTimeout(timer);
    }, [verified, isNewTab]);

    // Check verification status via polling
    useEffect(() => {
        // If already verified on mount, lock immediately
        const user = auth.currentUser;
        if (user?.emailVerified) {
            setVerified(true);
            return;
        }

        if (sessionStorage.getItem('ff-email-verified') === 'true') {
            setVerified(true);
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
                    setVerified(true);
                }
            } catch (e) {
                // ignore reload errors, try again next tick
            }
        }, 3000);

        return () => clearInterval(interval);
    }, []);

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
            await sendEmailVerification(user, {
                url: `${window.location.origin}/verify-email`,
                handleCodeInApp: false,
            });
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

    // ─── New tab from email link: just show "close this tab" ───
    if (isNewTab) {
        return (
            <main className={styles.page}>
                <div className={styles.container}>
                    <div className={`card ${styles.card}`}>
                        <div className={styles.icon} style={{ color: 'var(--ff-color-brand-primary)' }}>&#x2714;</div>
                        <h1 className={styles.title} style={{ color: 'var(--ff-color-brand-primary)' }}>Email Verified</h1>
                        <p className={styles.subtitle}>
                            You can close this tab.<br />
                            Your other tab is taking you to the onboarding survey.
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    // ─── Verified state: show success, then redirect ───
    if (verified) {
        return (
            <main className={styles.page}>
                <div className={styles.container}>
                    <div className={`card ${styles.card}`}>
                        <div className={styles.icon} style={{ color: 'var(--ff-color-brand-primary)' }}>&#x2714;</div>
                        <h1 className={styles.title} style={{ color: 'var(--ff-color-brand-primary)' }}>Email Verified</h1>
                        <p className={styles.subtitle}>Taking you to onboarding...</p>
                    </div>
                </div>
            </main>
        );
    }

    // ─── Waiting for verification ───
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

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={
            <main className={styles.page}>
                <div className={styles.container}>
                    <div className={`card ${styles.card}`}>
                        <div className={styles.spinner} />
                        <p>Loading...</p>
                    </div>
                </div>
            </main>
        }>
            <VerifyEmailContent />
        </Suspense>
    );
}
