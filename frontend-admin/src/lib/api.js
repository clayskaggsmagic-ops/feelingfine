'use client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

async function apiFetch(path, options = {}) {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_BASE}${path}`;
    const res = await fetch(url, { ...options, headers });

    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const error = new Error(body.error || `API error ${res.status}`);
        error.status = res.status;
        error.body = body;
        throw error;
    }

    if (res.status === 204) return null;
    return res.json();
}

export const api = {
    get: (path) => apiFetch(path),
    post: (path, data) => apiFetch(path, { method: 'POST', body: JSON.stringify(data) }),
    patch: (path, data) => apiFetch(path, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (path) => apiFetch(path, { method: 'DELETE' }),
};
