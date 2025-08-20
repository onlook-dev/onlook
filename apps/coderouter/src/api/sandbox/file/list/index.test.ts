import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { api_sandbox_file_list } from './index';

describe('sandbox files list endpoints', () => {
    it('GET /coderouter/api/sandbox/file/list returns empty object', async () => {
        const app = new Hono();
        api_sandbox_file_list(app);

        const response = await app.request(env.URL_PATH_PREFIX + '/api/sandbox/file/list', {
            method: 'GET',
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({});
    });
});
