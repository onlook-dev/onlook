import { sandboxRouter } from './routes/sandbox';
import { router } from './trpc';

export const appRouter = router({
    sandbox: sandboxRouter,
});

export type AppRouter = typeof appRouter;