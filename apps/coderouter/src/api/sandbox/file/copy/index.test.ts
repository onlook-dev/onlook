import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { api_sandbox_file_copy } from './index';

describe('sandbox files copy endpoints', () => {
    it('POST /coderouter/api/sandbox/file/copy returns empty object', async () => {
        const app = new Hono();
        api_sandbox_file_copy(app);

        const response = await app.request(env.URL_PATH_PREFIX + '/api/sandbox/file/copy', {
            method: 'POST',
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({});
    });
});
