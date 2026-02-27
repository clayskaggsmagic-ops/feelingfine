'use client';

import { AuthProvider } from '@/hooks/useAuth';
import ErrorBoundary from '@/components/ErrorBoundary';

export default function Providers({ children }) {
    return (
        <AuthProvider>
            <ErrorBoundary>
                {children}
            </ErrorBoundary>
        </AuthProvider>
    );
}

