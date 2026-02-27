'use client';

import { Component } from 'react';

/**
 * React Error Boundary — catches JS errors in child components and
 * displays a friendly fallback UI instead of a white screen.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', minHeight: '60vh', padding: '2rem',
                    textAlign: 'center', fontFamily: 'var(--ff-font-sans)',
                }}>
                    <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>😔</div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--ff-color-text-primary)' }}>
                        Something went wrong
                    </h2>
                    <p style={{ color: 'var(--ff-color-text-secondary)', marginBottom: '1.5rem', maxWidth: '400px', lineHeight: 1.6 }}>
                        We hit a bump in the road. This has been logged and we&apos;re looking into it.
                    </p>
                    <button
                        onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
                        style={{
                            background: 'var(--ff-color-brand-gradient)', color: 'white',
                            border: 'none', borderRadius: '12px', padding: '0.75rem 2rem',
                            fontSize: '1rem', fontWeight: 600, cursor: 'pointer',
                        }}
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
