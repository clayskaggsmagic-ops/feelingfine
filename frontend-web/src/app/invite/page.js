'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import styles from './invite.module.css';

export default function InvitePage() {
    return (
        <Suspense fallback={<main className={styles.page}><div className={styles.card}><p>Loading...</p></div></main>}>
            <InviteContent />
        </Suspense>
    );
}

function InviteContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { isAuthenticated, loading: authLoading } = useAuth();
    const code = searchParams.get('code');

    const [invite, setInvite] = useState(null);
    const [error, setError] = useState(null);
    const [accepting, setAccepting] = useState(false);
    const [accepted, setAccepted] = useState(false);

    useEffect(() => {
        if (!code) { setError('No invite code provided'); return; }
        api.get(`/v1/community/invite/${code}`)
            .then(setInvite)
            .catch(err => setError(err.message || 'Invite not found or expired'));
    }, [code]);

    async function handleAccept() {
        setAccepting(true);
        try {
            const result = await api.post(`/v1/community/invite/${code}/accept`);
            setAccepted(true);
            setTimeout(() => router.push('/community'), 1500);
        } catch (err) {
            setError(err.message || 'Failed to accept invite');
        } finally {
            setAccepting(false);
        }
    }

    function handleSignup() {
        // Store invite code, redirect to signup
        localStorage.setItem('pendingInvite', code);
        router.push('/signup');
    }

    if (!code) {
        return (
            <main className={styles.page}>
                <div className={styles.card}>
                    <h1>Invalid Invite</h1>
                    <p>No invite code was provided.</p>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className={styles.page}>
                <div className={styles.card}>
                    <div className={styles.icon}>😕</div>
                    <h1>Invite Not Found</h1>
                    <p>{error}</p>
                    <button className={styles.primaryBtn} onClick={() => router.push('/')}>
                        Go Home
                    </button>
                </div>
            </main>
        );
    }

    if (!invite) {
        return (
            <main className={styles.page}>
                <div className={styles.card}>
                    <p>Loading invite...</p>
                </div>
            </main>
        );
    }

    if (accepted) {
        return (
            <main className={styles.page}>
                <div className={styles.card}>
                    <div className={styles.icon}>🎉</div>
                    <h1>{invite.type === 'friend' ? 'Friend Added!' : 'Joined the Group!'}</h1>
                    <p>Redirecting to Community...</p>
                </div>
            </main>
        );
    }

    return (
        <main className={styles.page}>
            <div className={styles.card}>
                {invite.creatorPhoto && (
                    <img src={invite.creatorPhoto} alt="" className={styles.avatar} />
                )}

                {invite.type === 'friend' ? (
                    <>
                        <div className={styles.icon}>👋</div>
                        <h1>{invite.creatorName} wants to be your friend!</h1>
                        <p>Join Feeling Fine and connect on your wellness journey together.</p>
                    </>
                ) : (
                    <>
                        <div className={styles.icon}>👥</div>
                        <h1>Join {invite.groupName || 'a Group'}</h1>
                        {invite.groupDescription && <p>{invite.groupDescription}</p>}
                        <p className={styles.invitedBy}>Invited by {invite.creatorName}</p>
                    </>
                )}

                {authLoading ? (
                    <p>Loading...</p>
                ) : isAuthenticated ? (
                    <button
                        className={styles.primaryBtn}
                        onClick={handleAccept}
                        disabled={accepting}
                    >
                        {accepting ? 'Accepting...' : invite.type === 'friend' ? 'Accept Friend Request' : 'Join Group'}
                    </button>
                ) : (
                    <div className={styles.actions}>
                        <button className={styles.primaryBtn} onClick={handleSignup}>
                            Sign Up to Connect
                        </button>
                        <button className={styles.secondaryBtn} onClick={() => router.push('/login')}>
                            Already have an account? Log in
                        </button>
                    </div>
                )}
            </div>
        </main>
    );
}
