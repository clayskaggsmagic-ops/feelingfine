/**
 * Integration tests for content and tracking routes.
 * Requires backend running on port 3001.
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
    const data = await res.json();
    return { status: res.status, data };
}

describe('Content Routes — Auth Required', () => {
    it('GET /v1/content/daily-dose returns 401 without token', async () => {
        const { status } = await api('GET', '/v1/content/daily-dose');
        assert.equal(status, 401);
    });

    it('GET /v1/content/daily-dos returns 401 without token', async () => {
        const { status } = await api('GET', '/v1/content/daily-dos');
        assert.equal(status, 401);
    });

    it('GET /v1/content/cornerstones returns 401 without token', async () => {
        const { status } = await api('GET', '/v1/content/cornerstones');
        assert.equal(status, 401);
    });
});

describe('Tracking Routes — Auth Required', () => {
    it('GET /v1/tracking/today returns 401 without token', async () => {
        const { status } = await api('GET', '/v1/tracking/today');
        assert.equal(status, 401);
    });

    it('GET /v1/tracking/history returns 401 without token', async () => {
        const { status } = await api('GET', '/v1/tracking/history?days=30');
        assert.equal(status, 401);
    });

    it('POST /v1/tracking/feeling-score returns 401 without token', async () => {
        const { status } = await api('POST', '/v1/tracking/feeling-score', { score: 7 });
        assert.equal(status, 401);
    });

    it('POST /v1/tracking/complete-do returns 401 without token', async () => {
        const { status } = await api('POST', '/v1/tracking/complete-do', { doId: 'test' });
        assert.equal(status, 401);
    });

    it('POST /v1/tracking/uncomplete-do returns 401 without token', async () => {
        const { status } = await api('POST', '/v1/tracking/uncomplete-do', { doId: 'test' });
        assert.equal(status, 401);
    });

    it('POST /v1/tracking/custom-do returns 401 without token', async () => {
        const { status } = await api('POST', '/v1/tracking/custom-do', { text: 'Test' });
        assert.equal(status, 401);
    });

    it('GET /v1/tracking/report returns 401 without token', async () => {
        const { status } = await api('GET', '/v1/tracking/report');
        assert.equal(status, 401);
    });
});

describe('Route Existence', () => {
    it('All content routes exist (not 404)', async () => {
        // Without auth they should return 401, NOT 404
        const routes = [
            ['GET', '/v1/content/daily-dose'],
            ['GET', '/v1/content/daily-dos'],
            ['GET', '/v1/content/cornerstones'],
        ];
        for (const [method, path] of routes) {
            const { status } = await api(method, path);
            assert.notEqual(status, 404, `${method} ${path} returned 404 (route not registered)`);
        }
    });

    it('All tracking routes exist (not 404)', async () => {
        const routes = [
            ['GET', '/v1/tracking/today'],
            ['GET', '/v1/tracking/history'],
            ['POST', '/v1/tracking/feeling-score'],
            ['POST', '/v1/tracking/complete-do'],
            ['POST', '/v1/tracking/uncomplete-do'],
            ['POST', '/v1/tracking/custom-do'],
            ['GET', '/v1/tracking/report'],
        ];
        for (const [method, path] of routes) {
            const { status } = await api(method, path);
            assert.notEqual(status, 404, `${method} ${path} returned 404 (route not registered)`);
        }
    });
});
