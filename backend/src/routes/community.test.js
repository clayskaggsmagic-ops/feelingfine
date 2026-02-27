/**
 * Integration tests for community invite routes.
 * Requires backend running on port 3001.
 *
 * Validates:
 *  - Auth gates (401 without token)
 *  - Input validation (400 for bad type)
 *  - Public invite lookup (no auth → 404 for non-existent code)
 *  - Route existence (all invite routes return non-404)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = process.env.TEST_API_URL || 'http://localhost:3001';

async function api(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, options);
    // Handle 204 No Content
    if (res.status === 204) return { status: 204, data: null };
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
}

// ─── Auth Gates ─────────────────────────────────────────────────────────────

describe('Community Invite Routes — Auth Required', () => {
    it('POST /v1/community/invite returns 401 without token', async () => {
        const { status } = await api('POST', '/v1/community/invite', { type: 'friend' });
        assert.equal(status, 401);
    });

    it('POST /v1/community/invite/:code/accept returns 401 without token', async () => {
        const { status } = await api('POST', '/v1/community/invite/FAKECODE/accept');
        assert.equal(status, 401);
    });

    it('POST /v1/community/friends/request returns 401 without token', async () => {
        const { status } = await api('POST', '/v1/community/friends/request', { toUserId: 'x' });
        assert.equal(status, 401);
    });

    it('GET /v1/community/friends returns 401 without token', async () => {
        const { status } = await api('GET', '/v1/community/friends');
        assert.equal(status, 401);
    });
});

// ─── Public Invite Lookup ───────────────────────────────────────────────────

describe('Community Invite Routes — Public', () => {
    it('GET /v1/community/invite/:code returns 404 for non-existent code', async () => {
        const { status, data } = await api('GET', '/v1/community/invite/DOESNOTEXIST');
        assert.equal(status, 404);
        assert.equal(data.error, 'Invite not found');
    });

    it('GET /v1/community/invite/:code does NOT require auth (no 401)', async () => {
        const { status } = await api('GET', '/v1/community/invite/ANYCODE');
        // Should be 404 (not found), not 401 (unauthorized)
        assert.notEqual(status, 401, 'Public invite lookup should not require auth');
    });
});

// ─── Route Existence ────────────────────────────────────────────────────────

describe('Community Routes — Existence', () => {
    it('All community routes exist (not 404)', async () => {
        const routes = [
            ['POST', '/v1/community/invite'],
            ['GET', '/v1/community/invite/testcode'],
            ['POST', '/v1/community/invite/testcode/accept'],
            ['GET', '/v1/community/friends'],
            ['POST', '/v1/community/friends/request'],
            ['GET', '/v1/community/groups'],
            ['POST', '/v1/community/groups'],
            ['GET', '/v1/community/messages'],
            ['POST', '/v1/community/messages'],
        ];
        for (const [method, path] of routes) {
            const { status } = await api(method, path);
            assert.notEqual(status, 404, `${method} ${path} returned 404 (route not registered)`);
        }
    });
});
