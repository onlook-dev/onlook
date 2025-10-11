import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc';
import { projectsRouter } from './routers/projects';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    projects: projectsRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.projects.list();
 */
export const createCaller = createCallerFactory(appRouter);
