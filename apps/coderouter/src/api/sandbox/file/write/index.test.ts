import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { api_sandbox_file_write } from './index';

describe('sandbox files write endpoints', () => {
    it('POST /coderouter/api/sandbox/file/write returns empty object', async () => {
        const app = new Hono();
        api_sandbox_file_write(app);

        const response = await app.request(env.URL_PATH_PREFIX + '/api/sandbox/file/write', {
            method: 'POST',
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({});
    });
});
