import { publicProcedure, router } from '../trpc';

export const apiRouter = router({
    hello: publicProcedure.query(() => 'hello from external'),
});