import { getSandboxPreviewUrl } from '@onlook/constants';
import { shortenUuid } from '@onlook/utility/src/id';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { CodeProvider, createCodeProviderClient } from '@onlook/code-provider';

function getProvider(sandboxId: string, userId?: string) {
    return createCodeProviderClient(CodeProvider.CodeSandbox, {
        providerOptions: {
            codesandbox: {
                sandboxId,
                userId,
            },
        },
    });
}

export const sandboxRouter = createTRPCRouter({
    start: protectedProcedure
        .input(
            z.object({
                sandboxId: z.string(),
                userId: z.string().optional(),
            }),
        )
        .mutation(async ({ input }) => {
            const provider = await getProvider(input.sandboxId, input.userId);
            const session = await provider.createSession({
                args: {
                    id: shortenUuid(input.userId ?? uuidv4(), 20),
                },
            });
            await provider.destroy();
            return session;
        }),
    hibernate: protectedProcedure
        .input(
            z.object({
                sandboxId: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            const provider = await getProvider(input.sandboxId);
            await provider.pauseProject({});
            await provider.destroy();
        }),
    list: protectedProcedure.input(z.object({ sandboxId: z.string() })).query(async ({ input }) => {
        const provider = await getProvider(input.sandboxId);
        const res = await provider.listProjects({});
        // TODO future iteration of code provider abstraction will need this code to be refactored
        if ('projects' in res) {
            return res.projects;
        }
        return [];
    }),
    fork: protectedProcedure
        .input(
            z.object({
                sandbox: z.object({
                    id: z.string(),
                    port: z.number(),
                }),
                config: z
                    .object({
                        title: z.string().optional(),
                        tags: z.array(z.string()).optional(),
                    })
                    .optional(),
            }),
        )
        .mutation(async ({ input }) => {
            const provider = await getProvider(input.sandbox.id);
            const sandbox = await provider.createProject({
                source: 'template',
                id: input.sandbox.id,

                // Metadata
                title: input.config?.title,
                tags: input.config?.tags,
            });
            await provider.destroy();

            const previewUrl = getSandboxPreviewUrl(sandbox.id, input.sandbox.port);

            return {
                sandboxId: sandbox.id,
                previewUrl,
            };
        }),
    delete: protectedProcedure
        .input(
            z.object({
                sandboxId: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            const provider = await getProvider(input.sandboxId);
            await provider.stopProject({});
            await provider.destroy();
        }),
    createFromGitHub: protectedProcedure
        .input(
            z.object({
                repoUrl: z.string(),
                branch: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            // const fileOps = new FileOperations(session);
            // const sandbox = await sdk.sandboxes.create({
            //     source: 'git',
            //     url: input.repoUrl,
            //     branch: input.branch,
            //     async setup(session) {
            //         await addSetupTask(session);
            //         await updatePackageJson(session);
            //         await injectPreloadScript(session);
            //         await session.setup.run();
            //     },
            // });
            // return {
            //     sandboxId: sandbox.id,
            //     previewUrl: getSandboxPreviewUrl(sandbox.id, 3000),
            // };
            return {
                sandboxId: '123',
                previewUrl: 'https://sandbox.com',
            };
        }),
});
