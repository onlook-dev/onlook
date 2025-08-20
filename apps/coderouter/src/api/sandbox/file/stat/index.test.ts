import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { api_sandbox_file_stat } from './index';

describe('sandbox files stat endpoints', () => {
    it('GET /coderouter/api/sandbox/file/stat returns empty object', async () => {
        const app = new Hono();
        api_sandbox_file_stat(app);

        const response = await app.request(env.URL_PATH_PREFIX + '/api/sandbox/file/stat', {
            method: 'GET',
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({});
    });
});
