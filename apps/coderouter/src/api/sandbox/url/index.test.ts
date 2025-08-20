import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { api_sandbox_url } from './index';

describe('sandbox url endpoints', () => {
    it('GET /coderouter/api/sandbox/url returns empty object', async () => {
        const app = new Hono();
        api_sandbox_url(app);

        const response = await app.request(env.URL_PATH_PREFIX + '/api/sandbox/url', {
            method: 'GET',
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({});
    });
});
