import { createCallerFactory, createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { editorForwardRouter } from "./routers/editor";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    external: editorForwardRouter,
    hello: publicProcedure.query(() => {
        return "Hello from internal";
    }),
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
