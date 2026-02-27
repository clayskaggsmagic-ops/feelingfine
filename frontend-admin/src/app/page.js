'use client';

import { useState } from 'react';

export default function AdminLogin() {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    // Will be connected to backend in Prompt 10
    console.log('Admin passcode submitted');
  };

  return (
    <main style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--ff-space-lg)',
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%',
      }}>
        <h1 style={{
          fontSize: 'var(--ff-font-size-2xl)',
          marginBottom: 'var(--ff-space-xs)',
          color: 'var(--ff-color-brand-primary)',
        }}>
          Feeling Fine
        </h1>
        <p style={{
          color: 'var(--ff-color-text-secondary)',
          marginBottom: 'var(--ff-space-xl)',
          fontSize: 'var(--ff-font-size-sm)',
        }}>
          Admin Portal
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            placeholder="Enter admin passcode"
            style={{ marginBottom: 'var(--ff-space-sm)', textAlign: 'center' }}
          />
          {error && (
            <p style={{ color: 'var(--ff-color-error)', marginBottom: 'var(--ff-space-sm)' }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              background: 'var(--ff-color-brand-gradient)',
              color: 'var(--ff-color-text-inverse)',
              boxShadow: 'var(--ff-shadow-sm)',
            }}
          >
            Enter
          </button>
        </form>
      </div>
    </main>
  );
}
