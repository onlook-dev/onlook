import { createCallerFactory, createTRPCRouter } from '~/server/api/trpc';
import { invitationRouter, projectRouter, userRouter } from './routers';
import { canvasRouter } from './routers/canvas';
import { chatRouter } from './routers/chat';
import { codeRouter } from './routers/code';
import { domainRouter } from './routers/domain';
import { frameRouter } from './routers/frame';
import { memberRouter } from './routers/member';
import { sandboxRouter } from './routers/sandbox';
import { userCanvasRouter } from './routers/user-canvas';
import { githubRouter } from './routers/github';

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
    chat: chatRouter,
    frame: frameRouter,
    canvas: canvasRouter,
    userCanvas: userCanvasRouter,
    code: codeRouter,
    member: memberRouter,
    domain: domainRouter,
    github: githubRouter,
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
