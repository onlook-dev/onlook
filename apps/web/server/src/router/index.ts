import { apiRouter } from './routes/api';
import { postsRouter } from './routes/post';
import { subRouter } from './routes/sub';
import { router } from './trpc';

export const appRouter = router({
    posts: postsRouter,
    sub: subRouter,
    api: apiRouter,
});

export type AppRouter = typeof appRouter;