import {
    CodeProvider,
    createCodeProviderClient,
    getStaticCodeProvider,
} from '@onlook/code-provider';
import { getSandboxPreviewUrl } from '@onlook/constants';
import { shortenUuid } from '@onlook/utility/src/id';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { env } from '@/env';
import { v4 as uuidv4 } from 'uuid';

export function getProvider({
    sandboxId,
    userId,
}: {
    sandboxId: string;
    userId?: undefined | string;
}) {
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
            }),
        )
        .mutation(async ({ input, ctx }) => {
            const userId = ctx.user.id;
            const provider = await getProvider({
                sandboxId: input.sandboxId,
                userId,
            });
            const session = await provider.createSession({
                args: {
                    id: shortenUuid(userId, 20),
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
                await provider.destroy().catch(() => {});
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
            const MAX_RETRY_ATTEMPTS = 3;
            let lastError: Error | null = null;

            for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
                try {
                    const provider = await getProvider({ sandboxId: input.sandbox.id });
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

                    if ('destroy' in provider) {
                        await provider.destroy();
                    }

                    return {
                        sandboxId: sandbox.id,
                        previewUrl,
                    };
                } catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));

                    if (attempt < MAX_RETRY_ATTEMPTS) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, Math.pow(2, attempt) * 1000),
                        );
                    }
                }
            }
            console.error(lastError);
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to create sandbox after ${MAX_RETRY_ATTEMPTS} attempts: ${lastError?.message}`,
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
                await provider.destroy().catch(() => {});
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
            const MAX_RETRY_ATTEMPTS = 3;
            const DEFAULT_PORT = 3000;
            let lastError: Error | null = null;

            for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
                try {
                    const sandboxId = uuidv4();
                    const provider = await getProvider({ sandboxId });
                    const sandbox = await provider.createProjectFromGit({
                        repoUrl: input.repoUrl,
                        branch: input.branch,
                    });

                    const previewUrl = getSandboxPreviewUrl(sandbox.id, DEFAULT_PORT);

                    return {
                        sandboxId: sandbox.id,
                        previewUrl,
                    };
                } catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));

                    if (attempt < MAX_RETRY_ATTEMPTS) {
                        await new Promise((resolve) =>
                            setTimeout(resolve, Math.pow(2, attempt) * 1000),
                        );
                    }
                }
            }

            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to create GitHub sandbox after ${MAX_RETRY_ATTEMPTS} attempts: ${lastError?.message}`,
                cause: lastError,
            });
        }),
});
