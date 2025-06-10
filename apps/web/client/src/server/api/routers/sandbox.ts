import { env } from '@/env';
import { CodeSandbox } from '@codesandbox/sdk';
import { shortenUuid } from '@onlook/utility/src/id';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { injectPreloadScript } from '@/components/store/editor/pages/helper';

const sdk = new CodeSandbox(env.CSB_API_KEY);

export const sandboxRouter = createTRPCRouter({
    start: protectedProcedure.input(z.object({
        sandboxId: z.string(),
        userId: z.string(),
    })).mutation(async ({ input }) => {
        const startData = await sdk.sandboxes.resume(input.sandboxId);
        const session = await startData.createBrowserSession({
            id: shortenUuid(input.userId, 20)
        });
        return session;
    }),
    hibernate: protectedProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        await sdk.sandboxes.hibernate(input.sandboxId);
    }),
    list: protectedProcedure.query(async () => {
        const listResponse = await sdk.sandboxes.list();
        return listResponse;
    }),
    fork: protectedProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        const sandbox = await sdk.sandboxes.create({
            source: 'template',
            id: input.sandboxId,
        });
        return {
            sandboxId: sandbox.id,
            previewUrl: `https://${sandbox.id}-8084.csb.app`,
        };
    }),
    delete: protectedProcedure.input(z.object({
        sandboxId: z.string(),
    })).mutation(async ({ input }) => {
        await sdk.sandboxes.shutdown(input.sandboxId);
    }),
    createFromGitHub: protectedProcedure.input(z.object({
        repoUrl: z.string(),
        branch: z.string(),
    })).mutation(async ({ input }) => {
        const sandbox = await sdk.sandboxes.create({
            source: "git",
            url: input.repoUrl,
            branch: input.branch,
            async setup(session) {
                await injectPreloadScript(session);
                await session.setup.run();
            },
        })
        return {
            sandboxId: sandbox.id,
            previewUrl: `https://${sandbox.id}-8084.csb.app`,
        };
    }),
});
