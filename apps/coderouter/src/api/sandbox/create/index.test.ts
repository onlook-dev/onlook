import { describe, expect, it } from 'bun:test';
import { Hono } from 'hono';
import { api_sandbox_create } from './index';

describe('sandbox create endpoints', () => {
    it('POST /coderouter/api/sandbox/create returns empty object', async () => {
        const app = new Hono();
        api_sandbox_create(app);

        const response = await app.request(env.URL_PATH_PREFIX + '/api/sandbox/create', {
            method: 'POST',
        });

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body).toEqual({});
    });
});
