'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    getAuth,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
} from 'firebase/auth';
import { app } from '@/lib/firebase';
import { api } from '@/services/api';
import styles from './login.module.css';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const auth = getAuth(app);

    async function ensureBackendProfile(firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        try {
            await api.post('/v1/auth/login', { idToken });
        } catch (err) {
            // If login endpoint fails (e.g. no profile), try signup
            if (err.status === 404) {
                await api.post('/v1/auth/signup', {
                    idToken,
                    displayName: firebaseUser.displayName || '',
                });
            }
        }
    }

    async function handleEmailLogin(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            await ensureBackendProfile(cred.user);
            router.push('/dashboard');
        } catch (err) {
            console.error('[login] Error:', err);
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
                setError('Invalid email or password. Please try again.');
            } else if (err.code === 'auth/too-many-requests') {
                setError('Too many failed attempts. Please wait a moment and try again.');
            } else {
                setError(err.message || 'Something went wrong.');
            }
        } finally {
            setLoading(false);
        }
    }

    async function handleGoogleLogin() {
        setError('');
        setLoading(true);

        try {
            const provider = new GoogleAuthProvider();
            const cred = await signInWithPopup(auth, provider);
            await ensureBackendProfile(cred.user);
            router.push('/dashboard');
        } catch (err) {
            console.error('[login] Google error:', err);
            if (err.code !== 'auth/popup-closed-by-user') {
                setError(err.message || 'Google sign-in failed.');
            }
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className={styles.page}>
            <div className={styles.container}>
                <Link href="/" className={styles.backLink}>
                    ← Back
                </Link>

                <div className={`card ${styles.formCard}`}>
                    <div className={styles.header}>
                        <h1>Welcome Back</h1>
                        <p>Sign in to continue your wellness journey.</p>
                    </div>

                    {error && (
                        <div className={styles.error} role="alert">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleEmailLogin} className={styles.form}>
                        <div className={styles.field}>
                            <label htmlFor="login-email">Email Address</label>
                            <input
                                id="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="margaret@example.com"
                                required
                                autoComplete="email"
                            />
                        </div>

                        <div className={styles.field}>
                            <label htmlFor="login-password">Password</label>
                            <input
                                id="login-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Your password"
                                required
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className={`btn-primary ${styles.submitBtn}`}
                            disabled={loading}
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <span>or</span>
                    </div>

                    <button
                        type="button"
                        className={styles.googleBtn}
                        onClick={handleGoogleLogin}
                        disabled={loading}
                    >
                        <svg className={styles.googleIcon} viewBox="0 0 24 24" width="20" height="20">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Continue with Google
                    </button>

                    <p className={styles.switchText}>
                        Don&apos;t have an account? <Link href="/signup">Create one</Link>
                    </p>
                </div>
            </div>
        </main>
    );
}
