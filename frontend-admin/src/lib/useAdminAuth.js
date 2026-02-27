'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export function AdminAuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [passcodeVerified, setPasscodeVerified] = useState(false);
    const [error, setError] = useState(null);

    const isAdmin = profile?.role === 'admin';
    const isAuthenticated = !!user && !!profile && isAdmin && passcodeVerified;

    // Load profile when Firebase user changes
    const loadProfile = useCallback(async (firebaseUser) => {
        if (!firebaseUser) {
            setProfile(null);
            return;
        }
        try {
            const data = await api.get('/v1/auth/me');
            setProfile(data.user);
            if (data.user?.role !== 'admin') {
                setError('This account does not have admin access');
                await signOut(auth);
                setProfile(null);
            }
        } catch {
            setProfile(null);
        }
    }, []);

    useEffect(() => {
        // Check if passcode was verified this session
        const verified = sessionStorage.getItem('ff_admin_passcode');
        if (verified === 'true') setPasscodeVerified(true);

        const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                await loadProfile(firebaseUser);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });
        return unsub;
    }, [loadProfile]);

    async function verifyPasscode(passcode) {
        setError(null);
        try {
            const result = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/admin/verify-passcode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ passcode }),
            });
            const data = await result.json();
            if (!result.ok) throw new Error(data.error || 'Invalid passcode');
            setPasscodeVerified(true);
            sessionStorage.setItem('ff_admin_passcode', 'true');
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        }
    }

    async function googleSignIn() {
        setError(null);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (err) {
            setError(err.message);
        }
    }

    async function logout() {
        sessionStorage.removeItem('ff_admin_passcode');
        setPasscodeVerified(false);
        setProfile(null);
        await signOut(auth);
    }

    return (
        <AuthContext.Provider value={{
            user, profile, loading, error, isAuthenticated, isAdmin,
            passcodeVerified, verifyPasscode, googleSignIn, logout
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAdminAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
    return ctx;
}
