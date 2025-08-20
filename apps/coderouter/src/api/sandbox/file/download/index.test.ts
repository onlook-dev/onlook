import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { api_sandbox_file_download } from './index';

describe('sandbox files download endpoints', () => {
    it('GET /coderouter/api/sandbox/file/download returns empty object', async () => {
        const app = new Hono();
        api_sandbox_file_download(app);

        const response = await app.request(env.URL_PATH_PREFIX + '/api/sandbox/file/download', {
            method: 'GET',
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({});
    });
});
