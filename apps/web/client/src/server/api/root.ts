import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc';
import {
    chatRouter,
    domainRouter,
    frameRouter,
    githubRouter,
    invitationRouter,
    memberRouter,
    projectRouter,
    publishRouter,
    sandboxRouter,
    settingsRouter,
    subscriptionRouter,
    usageRouter,
    userCanvasRouter,
    userRouter,
    utilsRouter,
} from './routers';
import { branchRouter } from './routers/project/branch';

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
    branch: branchRouter,
    settings: settingsRouter,
    chat: chatRouter,
    frame: frameRouter,
    userCanvas: userCanvasRouter,
    utils: utilsRouter,
    member: memberRouter,
    domain: domainRouter,
    github: githubRouter,
    subscription: subscriptionRouter,
    usage: usageRouter,
    publish: publishRouter,
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
