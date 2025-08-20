import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { api_sandbox_file_delete } from './index';

describe('sandbox files delete endpoints', () => {
    it('DELETE /coderouter/api/sandbox/file/delete returns empty object', async () => {
        const app = new Hono();
        api_sandbox_file_delete(app);

        const response = await app.request(env.URL_PATH_PREFIX + '/api/sandbox/file/delete', {
            method: 'DELETE',
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({});
    });
});
