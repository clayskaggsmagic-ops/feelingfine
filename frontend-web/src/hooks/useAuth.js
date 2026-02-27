'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { app } from '@/lib/firebase';
import { api } from '@/services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);        // Firebase User object
    const [profile, setProfile] = useState(null);   // Backend user profile
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const auth = getAuth(app);

    // Load user profile from backend
    const loadProfile = useCallback(async () => {
        try {
            const data = await api.get('/v1/auth/me');
            setProfile(data.user || data);
            setError(null);
        } catch (err) {
            // 404 means user hasn't completed signup yet — that's OK
            if (err.status !== 404) {
                console.error('[useAuth] Failed to load profile:', err);
                setError(err.message);
            }
            setProfile(null);
        }
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);
            if (firebaseUser) {
                await loadProfile();
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [auth, loadProfile]);

    // Apply font-size preference globally whenever profile loads
    useEffect(() => {
        const multiplier = profile?.fontSizeMultiplier || 1.0;
        document.documentElement.style.fontSize = `${multiplier * 100}%`;
    }, [profile]);

    const logout = useCallback(async () => {
        await signOut(auth);
        setUser(null);
        setProfile(null);
    }, [auth]);

    const refreshProfile = useCallback(async () => {
        if (user) await loadProfile();
    }, [user, loadProfile]);

    const value = {
        user,           // Firebase Auth user (uid, email, etc.)
        profile,        // Backend profile (displayName, programDay, role, etc.)
        loading,        // True until initial auth check completes
        error,
        isAuthenticated: !!user,
        emailVerified: user?.emailVerified ?? false,
        isAdmin: profile?.role === 'admin',
        logout,
        refreshProfile,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
