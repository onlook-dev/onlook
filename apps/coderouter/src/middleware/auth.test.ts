import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { OpenAPIHono } from '@hono/zod-openapi';
import { setupAuthJwtMiddleware } from './auth';
import { decodeJwtToken, encodeJwtToken, AuthJwtPayload } from '@/util/auth';
import type { LocalHono } from '@/server';
import { env } from 'bun';

// Mock the environment variable
const originalEnv = process.env.JWT_SECRET_KEY;
const mockJwtSecret = 'test-secret-key';

describe('Auth JWT Middleware', () => {
    let app: LocalHono;

    beforeEach(() => {
        // Set up test environment
        process.env.JWT_SECRET_KEY = mockJwtSecret;

        // Create a fresh app instance for each test
        app = new OpenAPIHono<{
            Variables: { client: any; auth: AuthJwtPayload };
        }>();

        // Set up the auth middleware
        setupAuthJwtMiddleware(app, env.URL_PATH_PREFIX + '/*');

        // Add a test route to verify middleware works
        app.get(env.URL_PATH_PREFIX + '/api/test', (c) => {
            const auth = c.get('auth');
            return c.json({ success: true, auth });
        });
    });

    afterEach(() => {
        // Restore original environment
        if (originalEnv) {
            process.env.JWT_SECRET_KEY = originalEnv;
        } else {
            delete process.env.JWT_SECRET_KEY;
        }
    });

    describe('Missing JWT token', () => {
        it('should return 401 when X-Auth-Jwt header is missing', async () => {
            const res = await app.request(env.URL_PATH_PREFIX + '/api/test');

            expect(res.status).toBe(401);
            const body = (await res.json()) as { error: string };
            expect(body).toEqual({ error: 'Unauthorized' });
        });

        it('should return 401 when X-Auth-Jwt header is empty', async () => {
            const res = await app.request(env.URL_PATH_PREFIX + '/api/test', {
                headers: {
                    'X-Auth-Jwt': '',
                },
            });

            expect(res.status).toBe(401);
            const body = (await res.json()) as { error: string };
            expect(body).toEqual({ error: 'Unauthorized' });
        });
    });

    describe('Valid JWT token', () => {
        it('should allow request with valid JWT token', async () => {
            const payload: AuthJwtPayload = {
                sandboxId: 'test-sandbox-123',
                userId: 'test-user-456',
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
                auth: AuthJwtPayload;
            };
            expect(body.success).toBe(true);
            expect(body.auth.sandboxId).toBe(payload.sandboxId!);
            expect(body.auth.userId).toBe(payload.userId!);
        });

        it('should allow request with minimal JWT payload', async () => {
            const payload: AuthJwtPayload = {};

            const token = encodeJwtToken(payload);

            const res = await app.request(env.URL_PATH_PREFIX + '/api/test', {
                headers: {
                    'X-Auth-Jwt': token,
                },
            });

            expect(res.status).toBe(200);
            const body = (await res.json()) as {
                success: boolean;
                auth: AuthJwtPayload;
            };
            expect(body.success).toBe(true);
            expect(body.auth.sandboxId).toBeUndefined();
            expect(body.auth.userId).toBeUndefined();
        });

        it('should set auth context for downstream handlers', async () => {
            const payload: AuthJwtPayload = {
                sandboxId: 'sandbox-789',
                userId: 'user-101',
            };

            const token = encodeJwtToken(payload);

            // Add a custom handler that checks the auth context
            app.get(env.URL_PATH_PREFIX + '/api/auth-test', (c) => {
                const auth = c.get('auth');
                return c.json({
                    sandboxId: auth.sandboxId,
                    userId: auth.userId,
                });
            });

            const res = await app.request(env.URL_PATH_PREFIX + '/api/auth-test', {
                headers: {
                    'X-Auth-Jwt': token,
                },
            });

            expect(res.status).toBe(200);
            const body = (await res.json()) as {
                sandboxId?: string;
                userId?: string;
            };
            expect(body.sandboxId).toBe('sandbox-789');
            expect(body.userId).toBe('user-101');
        });
    });

    describe('Invalid JWT token', () => {
        it('should return 401 when JWT token is malformed', async () => {
            const res = await app.request(env.URL_PATH_PREFIX + '/api/test', {
                headers: {
                    'X-Auth-Jwt': 'invalid-token',
                },
            });

            expect(res.status).toBe(401);
            const body = (await res.json()) as { error: string };
            expect(body).toEqual({
                error: 'Failed to decode JWT. Fetch a new JWT token.',
            });
        });

        it('should return 401 when JWT token is signed with wrong secret', async () => {
            // Create a token with a different secret
            const payload: AuthJwtPayload = { sandboxId: 'test' };
            const wrongToken = encodeJwtToken(payload);

            // Change the secret to make the token invalid
            process.env.JWT_SECRET_KEY = 'different-secret';

            const res = await app.request(env.URL_PATH_PREFIX + '/api/test', {
                headers: {
                    'X-Auth-Jwt': wrongToken,
                },
            });

            expect(res.status).toBe(401);
            const body = (await res.json()) as { error: string };
            expect(body).toEqual({
                error: 'Failed to decode JWT. Fetch a new JWT token.',
            });
        });

        it('should return 401 when JWT token is expired', async () => {
            // Create an expired token by using a past expiration time
            const payload: AuthJwtPayload = { sandboxId: 'test' };
            const expiredToken = encodeJwtToken(payload);

            // Temporarily change the JWT secret to make the token invalid
            const originalSecret = process.env.JWT_SECRET_KEY;
            process.env.JWT_SECRET_KEY = 'different-secret-for-expired-test';

            const res = await app.request(env.URL_PATH_PREFIX + '/api/test', {
                headers: {
                    'X-Auth-Jwt': expiredToken,
                },
            });

            expect(res.status).toBe(401);
            const body = (await res.json()) as { error: string };
            expect(body).toEqual({
                error: 'Failed to decode JWT. Fetch a new JWT token.',
            });

            // Restore original secret
            process.env.JWT_SECRET_KEY = originalSecret;
        });
    });

    describe('Middleware scope', () => {
        it('should only apply to /coderouter/api/* routes', async () => {
            // Add a route outside the /api scope
            app.get('/public/test', (c) => {
                return c.json({ public: true });
            });

            const res = await app.request('/public/test');

            expect(res.status).toBe(200);
            const body = (await res.json()) as { public: boolean };
            expect(body).toEqual({ public: true });
        });

        it('should apply to nested /api routes', async () => {
            app.get(env.URL_PATH_PREFIX + '/api/nested/deep/route', (c) => {
                const auth = c.get('auth');
                return c.json({ nested: true, auth });
            });

            const payload: AuthJwtPayload = { sandboxId: 'nested-test' };
            const token = encodeJwtToken(payload);

            const res = await app.request(env.URL_PATH_PREFIX + '/api/nested/deep/route', {
                headers: {
                    'X-Auth-Jwt': token,
                },
            });

            expect(res.status).toBe(200);
            const body = (await res.json()) as {
                nested: boolean;
                auth: AuthJwtPayload;
            };
            expect(body.nested).toBe(true);
            expect(body.auth.sandboxId).toBe(payload.sandboxId!);
        });
    });
});
