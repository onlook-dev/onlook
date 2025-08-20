import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { api_sandbox_stop } from './index';

describe('sandbox stop endpoints', () => {
    it('POST /coderouter/api/sandbox/stop returns empty object', async () => {
        const app = new Hono();
        api_sandbox_stop(app);

        const response = await app.request(env.URL_PATH_PREFIX + '/api/sandbox/stop', {
            method: 'POST',
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({});
    });
});
