/**
 * Integration tests for auth routes.
 *
 * NOTE: These tests validate route handling logic, request/response shapes,
 * and error paths. Since Firebase Auth token verification requires a valid
 * Firebase project connection, these tests document the expected behavior
 * and can be run against a local emulator or with a real token.
 *
 * To test manually with curl:
 *
 * 1. Get a Firebase ID token from the frontend (sign in, then run in browser console):
 *    const token = await firebase.auth().currentUser.getIdToken();
 *
 * 2. Test signup:
 *    curl -X POST http://localhost:3001/v1/auth/signup \
 *      -H "Content-Type: application/json" \
 *      -d '{"idToken": "<token>", "displayName": "Test User"}'
 *
 * 3. Test login:
 *    curl -X POST http://localhost:3001/v1/auth/login \
 *      -H "Content-Type: application/json" \
 *      -d '{"idToken": "<token>"}'
 *
 * 4. Test get profile:
 *    curl http://localhost:3001/v1/auth/me \
 *      -H "Authorization: Bearer <token>"
 *
 * 5. Test update profile:
 *    curl -X PATCH http://localhost:3001/v1/auth/me \
 *      -H "Authorization: Bearer <token>" \
 *      -H "Content-Type: application/json" \
 *      -d '{"displayName": "New Name", "preferences": {"fontSizeMultiplier": 1.5}}'
 *
 * 6. Test Google sign-in:
 *    curl -X POST http://localhost:3001/v1/auth/google \
 *      -H "Content-Type: application/json" \
 *      -d '{"idToken": "<google-token>"}'
 *
 * 7. Test password reset:
 *    curl -X POST http://localhost:3001/v1/auth/reset-password \
 *      -H "Content-Type: application/json" \
 *      -d '{"email": "test@example.com"}'
 *
 * 8. Test delete account:
 *    curl -X DELETE http://localhost:3001/v1/auth/me \
 *      -H "Authorization: Bearer <token>"
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

// ─── Helper ─────────────────────────────────────────────────────────────────

async function api(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${BASE_URL}${path}`, options);
    const data = await res.json();
    return { status: res.status, data };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Auth Routes — Validation', () => {
    it('POST /v1/auth/signup returns 400 without idToken', async () => {
        const { status, data } = await api('POST', '/v1/auth/signup', {});
        assert.equal(status, 400);
        assert.equal(data.error, 'idToken is required');
    });

    it('POST /v1/auth/login returns 400 without idToken', async () => {
        const { status, data } = await api('POST', '/v1/auth/login', {});
        assert.equal(status, 400);
        assert.equal(data.error, 'idToken is required');
    });

    it('POST /v1/auth/google returns 400 without idToken', async () => {
        const { status, data } = await api('POST', '/v1/auth/google', {});
        assert.equal(status, 400);
        assert.equal(data.error, 'idToken is required');
    });

    it('POST /v1/auth/reset-password returns 400 without email', async () => {
        const { status, data } = await api('POST', '/v1/auth/reset-password', {});
        assert.equal(status, 400);
        assert.equal(data.error, 'email is required');
    });

    it('GET /v1/auth/me returns 401 without auth header', async () => {
        const { status, data } = await api('GET', '/v1/auth/me');
        assert.equal(status, 401);
        assert.ok(data.error);
    });

    it('PATCH /v1/auth/me returns 401 without auth header', async () => {
        const { status, data } = await api('PATCH', '/v1/auth/me', { displayName: 'Test' });
        assert.equal(status, 401);
        assert.ok(data.error);
    });

    it('DELETE /v1/auth/me returns 401 without auth header', async () => {
        const { status, data } = await api('DELETE', '/v1/auth/me');
        assert.equal(status, 401);
        assert.ok(data.error);
    });

    it('POST /v1/auth/signup returns 500 with invalid token', async () => {
        const { status } = await api('POST', '/v1/auth/signup', { idToken: 'invalid-token-xxx' });
        // Firebase will reject the token — should return 500 (unhandled) or a token error
        assert.ok(status >= 400, `Expected 4xx or 5xx, got ${status}`);
    });

    it('GET /v1/auth/me returns 401 with invalid Bearer token', async () => {
        const { status, data } = await api('GET', '/v1/auth/me', null, 'invalid-token');
        assert.equal(status, 401);
        assert.equal(data.error, 'Invalid or expired token');
    });
});

describe('Health Check', () => {
    it('GET /health returns ok', async () => {
        const { status, data } = await api('GET', '/health');
        assert.equal(status, 200);
        assert.equal(data.status, 'ok');
        assert.equal(data.project, 'feelingfine-b4106');
        assert.ok(data.timestamp);
    });
});
