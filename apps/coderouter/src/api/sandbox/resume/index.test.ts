import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { api_sandbox_resume } from './index';

describe('sandbox resume endpoints', () => {
    it('POST /coderouter/api/sandbox/resume returns empty object', async () => {
        const app = new Hono();
        api_sandbox_resume(app);

        const response = await app.request(env.URL_PATH_PREFIX + '/api/sandbox/resume', {
            method: 'POST',
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({});
    });
});
