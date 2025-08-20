import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { api_sandbox_pause } from './index';

describe('sandbox pause endpoints', () => {
    it('POST /coderouter/api/sandbox/pause returns empty object', async () => {
        const app = new Hono();
        api_sandbox_pause(app);

        const response = await app.request(env.URL_PATH_PREFIX + '/api/sandbox/pause', {
            method: 'POST',
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({});
    });
});
