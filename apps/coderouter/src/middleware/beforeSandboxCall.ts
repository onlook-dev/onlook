import { LocalHono } from '@/server';

export function setupBeforeSandboxCallMiddleware(app: LocalHono, path: string) {
    return app.use(path, async (c, next) => {
        const client = c.get('client');
        if (!client) {
            console.error('The provider client is not set. Please check the middleware setup.');
            return c.json({ error: 'Client not found' }, 500);
        }
        await client.sandbox.beforeSandboxCall();
        await next();
    });
}
