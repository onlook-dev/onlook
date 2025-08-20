import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { api_sandbox_file_rename } from './index';

describe('sandbox files rename endpoints', () => {
    it('PUT /coderouter/api/sandbox/file/rename returns empty object', async () => {
        const app = new Hono();
        api_sandbox_file_rename(app);

        const response = await app.request(env.URL_PATH_PREFIX + '/api/sandbox/file/rename', {
            method: 'PUT',
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({});
    });
});
