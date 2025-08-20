import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { OpenAPIHono } from '@hono/zod-openapi';
import { setupClientMiddleware } from './client';
import { setupAuthJwtMiddleware } from './auth';
import type { LocalHono } from '@/server';
import { AuthJwtPayload } from '@/util/auth';
import { encodeJwtToken } from '@/util/auth';

// Store original environment
const originalEnv = process.env.E2B_API_KEY;
const originalJwtEnv = process.env.JWT_SECRET_KEY;

describe('setupClientMiddleware', () => {
    let app: LocalHono;

    beforeEach(() => {
        // Set up test environment
        process.env.JWT_SECRET_KEY = 'test-jwt-secret';

        // Create a fresh app instance for each test
        app = new OpenAPIHono<{
            Variables: { client: any; auth: AuthJwtPayload };
        }>();

        // Set up auth middleware first (required for client middleware)
        setupAuthJwtMiddleware(app);

        // Set up client middleware
        setupClientMiddleware(app);

        // Add a test route to verify middleware works
        app.get(env.URL_PATH_PREFIX + '/api/test', (c) => {
            const client = c.get('client');
            const auth = c.get('auth');
            return c.json({
                success: true,
                hasClient: !!client,
                clientType: client?.constructor?.name,
                auth,
            });
        });
    });

    afterEach(() => {
        // Restore original environment
        if (originalEnv) {
            process.env.E2B_API_KEY = originalEnv;
        } else {
            delete process.env.E2B_API_KEY;
        }

        if (originalJwtEnv) {
            process.env.JWT_SECRET_KEY = originalJwtEnv;
        } else {
            delete process.env.JWT_SECRET_KEY;
        }
    });

    describe('when E2B_API_KEY is set', () => {
        beforeEach(() => {
            process.env.E2B_API_KEY = 'test-api-key';
        });

        it('should create E2BClient and set it in context', async () => {
            const payload: AuthJwtPayload = {
                sandboxId: 'test-sandbox-id',
                userId: 'test-user-id',
            };

            const token = encodeJwtToken(payload);

            const res = await app.request(env.URL_PATH_PREFIX + '/api/test', {
                headers: {
                    'X-Auth-Jwt': token,
                },
            });

            expect(res.status).toBe(200);
            const body = (await res.json()) as {
                success: boolean;
                hasClient: boolean;
                clientType: string;
                auth: AuthJwtPayload;
            };
            expect(body.success).toBe(true);
            expect(body.hasClient).toBe(true);
            expect(body.clientType).toBe('E2BClient');
            expect(body.auth.sandboxId).toBe('test-sandbox-id');
            expect(body.auth.userId).toBe('test-user-id');
        });

        it('should handle auth data with undefined values', async () => {
            const payload: AuthJwtPayload = {
                sandboxId: undefined,
                userId: undefined,
            };

            const token = encodeJwtToken(payload);

            const res = await app.request(env.URL_PATH_PREFIX + '/api/test', {
                headers: {
                    'X-Auth-Jwt': token,
                },
            });

            expect(res.status).toBe(200);
            const body = (await res.json()) as {
                success: boolean;
                hasClient: boolean;
                clientType: string;
                auth: AuthJwtPayload;
            };
            expect(body.success).toBe(true);
            expect(body.hasClient).toBe(true);
            expect(body.auth.sandboxId).toBeUndefined();
            expect(body.auth.userId).toBeUndefined();
        });

        it('should handle partial auth data', async () => {
            const payload: AuthJwtPayload = {
                sandboxId: 'test-sandbox-id',
                userId: undefined,
            };

            const token = encodeJwtToken(payload);

            const res = await app.request(env.URL_PATH_PREFIX + '/api/test', {
                headers: {
                    'X-Auth-Jwt': token,
                },
            });

            expect(res.status).toBe(200);
            const body = (await res.json()) as {
                success: boolean;
                hasClient: boolean;
                clientType: string;
                auth: AuthJwtPayload;
            };
            expect(body.success).toBe(true);
            expect(body.hasClient).toBe(true);
            expect(body.auth.sandboxId).toBe('test-sandbox-id');
            expect(body.auth.userId).toBeUndefined();
        });
    });

    describe('when E2B_API_KEY is not set', () => {
        beforeEach(() => {
            process.env.E2B_API_KEY = undefined;
        });

        it('should return 500 error response and not continue to route handler', async () => {
            const payload: AuthJwtPayload = {
                sandboxId: 'test-sandbox-id',
                userId: 'test-user-id',
            };

            const token = encodeJwtToken(payload);

            const res = await app.request(env.URL_PATH_PREFIX + '/api/test', {
                headers: {
                    'X-Auth-Jwt': token,
                },
            });

            expect(res.status).toBe(500);
            const body = (await res.json()) as { error: string };
            expect(body).toEqual({
                error: '"E2B_API_KEY" is not set',
            });
        });

        it('should return 500 error response even with valid auth data', async () => {
            const payload: AuthJwtPayload = {
                sandboxId: 'test-sandbox-id',
                userId: 'test-user-id',
            };

            const token = encodeJwtToken(payload);

            const res = await app.request(env.URL_PATH_PREFIX + '/api/test', {
                headers: {
                    'X-Auth-Jwt': token,
                },
            });

            expect(res.status).toBe(500);
            const body = (await res.json()) as { error: string };
            expect(body).toEqual({
                error: '"E2B_API_KEY" is not set',
            });
        });

        it('should return 500 error response for any API route', async () => {
            // Add another API route
            app.get(env.URL_PATH_PREFIX + '/api/another-test', (c) => {
                return c.json({ another: true });
            });

            const payload: AuthJwtPayload = {
                sandboxId: 'test-sandbox-id',
                userId: 'test-user-id',
            };

            const token = encodeJwtToken(payload);

            const res = await app.request(env.URL_PATH_PREFIX + '/api/another-test', {
                headers: {
                    'X-Auth-Jwt': token,
                },
            });

            expect(res.status).toBe(500);
            const body = (await res.json()) as { error: string };
            expect(body).toEqual({
                error: '"E2B_API_KEY" is not set',
            });
        });
    });

    describe('middleware integration', () => {
        it('should apply middleware to /coderouter/api/* routes', () => {
            process.env.E2B_API_KEY = 'test-api-key';
            const result = setupClientMiddleware(app);

            // The middleware should return the app
            expect(result).toBe(app);
        });

        it('should not apply middleware to non-api routes', async () => {
            process.env.E2B_API_KEY = 'test-api-key';

            // Add a route outside the /api scope
            app.get('/public/test', (c) => {
                return c.json({ public: true });
            });

            const res = await app.request('/public/test');

            expect(res.status).toBe(200);
            const body = (await res.json()) as { public: boolean };
            expect(body).toEqual({ public: true });
        });

        it('should handle multiple requests correctly', async () => {
            process.env.E2B_API_KEY = 'test-api-key';

            const payload: AuthJwtPayload = {
                sandboxId: 'test-sandbox-id',
                userId: 'test-user-id',
            };

            const token = encodeJwtToken(payload);

            // Make multiple requests
            const res1 = await app.request(env.URL_PATH_PREFIX + '/api/test', {
                headers: {
                    'X-Auth-Jwt': token,
                },
            });

            const res2 = await app.request(env.URL_PATH_PREFIX + '/api/test', {
                headers: {
                    'X-Auth-Jwt': token,
                },
            });

            expect(res1.status).toBe(200);
            expect(res2.status).toBe(200);

            const body1 = (await res1.json()) as { hasClient: boolean };
            const body2 = (await res2.json()) as { hasClient: boolean };
            expect(body1.hasClient).toBe(true);
            expect(body2.hasClient).toBe(true);
        });
    });
});
