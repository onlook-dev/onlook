import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { api_sandbox_file_read } from './index';

describe('sandbox files read endpoints', () => {
    it('GET /coderouter/api/sandbox/file/read returns empty object', async () => {
        const app = new Hono();
        api_sandbox_file_read(app);

        const response = await app.request(env.URL_PATH_PREFIX + '/api/sandbox/file/read', {
            method: 'GET',
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({});
    });
});
