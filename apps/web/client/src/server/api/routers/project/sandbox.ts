import { CodeProvider, createCodeProviderClient, getStaticCodeProvider } from '@onlook/code-provider';
import { getSandboxPreviewUrl } from '@onlook/constants';
import { shortenUuid } from '@onlook/utility/src/id';
import { TRPCError } from '@trpc/server';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

function getProvider({
    sandboxId,
    userId,
    provider = CodeProvider.CodeSandbox,
}: {
    sandboxId: string,
    provider?: CodeProvider,
    userId?: undefined | string,
}) {
    if (provider === CodeProvider.CodeSandbox) {
        return createCodeProviderClient(CodeProvider.CodeSandbox, {
            providerOptions: {
                codesandbox: {
                    sandboxId,
                    userId,
                },
            },
        });
    } else {
        return createCodeProviderClient(CodeProvider.NodeFs, {
            providerOptions: {
                nodefs: {},
            },
        });
    }
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
            const provider = await getProvider({
                sandboxId: input.sandboxId,
                userId: input.userId,
            });
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
            const provider = await getProvider({ sandboxId: input.sandboxId });
            try {
                await provider.pauseProject({});
            } finally {
                await provider.destroy().catch(() => { });
            }
        }),
    list: protectedProcedure.input(z.object({ sandboxId: z.string() })).query(async ({ input }) => {
        const provider = await getProvider({ sandboxId: input.sandboxId });
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
            const maxRetries = 3;
            let lastError: Error | null = null;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const CodesandboxProvider = await getStaticCodeProvider(CodeProvider.CodeSandbox);
                    const sandbox = await CodesandboxProvider.createProject({
                        source: 'template',
                        id: input.sandbox.id,

                        // Metadata
                        title: input.config?.title,
                        tags: input.config?.tags,
                    });

                    const previewUrl = getSandboxPreviewUrl(sandbox.id, input.sandbox.port);

                    return {
                        sandboxId: sandbox.id,
                        previewUrl,
                    };
                } catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    console.error(`Sandbox creation attempt ${attempt} failed:`, lastError);

                    if (attempt < maxRetries) {
                        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
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
            const provider = await getProvider({ sandboxId: input.sandboxId });
            try {
                await provider.stopProject({});
            } finally {
                await provider.destroy().catch(() => { });
            }
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
