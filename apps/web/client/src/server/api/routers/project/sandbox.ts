import { CodeProvider, createCodeProviderClient } from '@onlook/code-provider';
import { getSandboxPreviewUrl } from '@onlook/constants';
import { shortenUuid } from '@onlook/utility/src/id';
import { TRPCError } from '@trpc/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { env } from '@/env';

function getProvider(sandboxId: string, userId?: string) {
    return createCodeProviderClient(CodeProvider.Coderouter, {
        providerOptions: {
            coderouter: {
                url: env.CODEROUTER_HOST_URL,
                sandboxId: sandboxId,
                userId: userId,
                getSession: async (provider, sandboxId, userId) => {
                    const res = await provider.createSession({
                        args: {
                            id: shortenUuid(userId ?? uuidv4(), 20),
                        },
                    });
                    return {
                        jwt: res.jwt,
                    };
                },
            },
            // codesandbox: {
            //     sandboxId: forkedSandbox.sandboxId,
            //     userId: user.id,
            //     initClient: true,
            //     keepActiveWhileConnected: false,
            //     getSession: async (sandboxId, userId) => {
            //         return startSandbox({
            //             sandboxId,
            //             userId,
            //         });
            //     },
            // },
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
            try {
                const session = await provider.createSession({
                    args: {
                        id: shortenUuid(input.userId ?? uuidv4(), 20),
                    },
                });
                await provider.destroy();
                return session;
            } catch (error) {
                throw error;
            }
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
                userId: z.string().optional(),
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
            const maxRetries = 3;
            let lastError: Error | null = null;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const provider = await getProvider(input.sandbox.id);
                    const sandbox = await provider.createProject({
                        source: 'template',
                        id: input.sandbox.id,
                        userId: input.userId,
                        templateId: env.E2B_DEFAULT_TEMPLATE_ID,
                        // Metadata
                        title: input.config?.title,
                        tags: input.config?.tags,
                    });

                    const previewUrl = await provider
                        .getProjectUrl({ args: {} })
                        .then((res) => res.url);

                    await provider.destroy();

                    return {
                        sandboxId: sandbox.id,
                        previewUrl,
                    };
                } catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    console.error(`Sandbox creation attempt ${attempt} failed:`, lastError);

                    if (attempt < maxRetries) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, Math.pow(2, attempt) * 1000),
                        );
                    }
                }
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to create sandbox after ${maxRetries} attempts: ${lastError?.message}`,
                cause: lastError,
            });
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
