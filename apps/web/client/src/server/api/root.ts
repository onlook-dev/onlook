import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc';
import { canvasRouter, chatRouter, codeRouter, domainRouter, frameRouter, githubRouter, imageRouter, invitationRouter, memberRouter, projectRouter, sandboxRouter, settingsRouter, subscriptionRouter, usageRouter, userCanvasRouter, userRouter } from './routers';

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
    sandbox: sandboxRouter,
    user: userRouter,
    invitation: invitationRouter,
    project: projectRouter,
    settings: settingsRouter,
    chat: chatRouter,
    frame: frameRouter,
    canvas: canvasRouter,
    userCanvas: userCanvasRouter,
    code: codeRouter,
    member: memberRouter,
    domain: domainRouter,
    github: githubRouter,
    subscription: subscriptionRouter,
    usage: usageRouter,
    image: imageRouter,
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
