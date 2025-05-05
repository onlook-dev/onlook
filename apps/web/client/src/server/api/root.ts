import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { editorForwardRouter } from "./routers/editor";

import { csbRouter } from "./routers/csb";
import { projectRouter } from "./routers/project";
import { userRouter } from "./routers/user";
/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    external: editorForwardRouter,
    csb: csbRouter,
    user: userRouter,
    project: projectRouter,
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
