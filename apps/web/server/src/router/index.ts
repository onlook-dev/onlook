import { apiRouter } from './routes/api';
import { router } from './trpc';

export const appRouter = router({
    api: apiRouter,
});

export type AppRouter = typeof appRouter;