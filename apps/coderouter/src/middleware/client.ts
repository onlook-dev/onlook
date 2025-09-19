import { E2BClient } from '@/provider/e2b';
import { env } from 'bun';
import { LocalHono } from '@/server';
import { CodesandboxClient } from '@/provider/codesandbox';

export function setupClientMiddleware(app: LocalHono, path: string) {
    return app.use(path, async (c, next) => {
        if (env.E2B_API_KEY) {
            const auth = c.get('auth');
            c.set(
                'client',
                new E2BClient(
                    {
                        sandboxId: auth?.sandboxId,
                        userId: auth?.userId,
                    },
                    env.E2B_API_KEY,
                ),
            );
            await next();
        } else if (env.CSB_API_KEY) {
            const auth = c.get('auth');
            c.set(
                'client',
                new CodesandboxClient(
                    {
                        sandboxId: auth?.sandboxId,
                        userId: auth?.userId,
                    },
                    env.CSB_API_KEY,
                ),
            );
            await next();
        } else {
            return c.json(
                {
                    error: `"E2B_API_KEY" is not set`,
                },
                500,
            );
        }
    });
}
