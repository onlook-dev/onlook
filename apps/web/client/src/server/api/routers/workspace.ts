import { CodeProvider, createCodeProviderClient, type Provider } from '@onlook/code-provider';
import { branches, userProjects, type DrizzleDb } from '@onlook/db';
import { sanitizeFilename } from '@onlook/utility';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

const PIXELRAFT_DIRECTORY = '/.pixelraft';
const COMMENTS_FILE = `${PIXELRAFT_DIRECTORY}/collaboration-comments.json`;
const MCP_FILE = `${PIXELRAFT_DIRECTORY}/mcp.json`;

const commentSchema = z.object({
    id: z.string(),
    content: z.string(),
    createdBy: z.string(),
    targetFrameId: z.string().nullable(),
    resolved: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

const commentsSchema = z.array(commentSchema);

type CollaborationComment = z.infer<typeof commentSchema>;

const mcpConfigSchema = z.object({
    serverName: z.string().min(1).default('project-mcp'),
    command: z.string().min(1).default('bun run mcp'),
    args: z.array(z.string()).default([]),
    env: z.record(z.string(), z.string()).default({}),
    updatedAt: z.string().optional(),
    updatedBy: z.string().optional(),
});

type McpConfig = z.infer<typeof mcpConfigSchema>;

const defaultMcpConfig: McpConfig = {
    serverName: 'project-mcp',
    command: 'bun run mcp',
    args: [],
    env: {},
};

async function getBranchProvider({
    branchId,
    userId,
    db,
}: {
    branchId: string;
    userId: string;
    db: DrizzleDb;
}): Promise<{ provider: Provider; sandboxId: string }> {
    const branch = await db.query.branches.findFirst({
        where: eq(branches.id, branchId),
        with: {
            project: {
                with: {
                    userProjects: {
                        where: eq(userProjects.userId, userId),
                        columns: {
                            userId: true,
                        },
                    },
                },
            },
        },
    });

    if (!branch?.project || branch.project.userProjects.length === 0) {
        throw new TRPCError({
            code: 'FORBIDDEN',
            message: 'You do not have access to this branch',
        });
    }

    const provider = await createCodeProviderClient(CodeProvider.CodeSandbox, {
        providerOptions: {
            codesandbox: {
                sandboxId: branch.sandboxId,
                initClient: true,
            },
        },
    });

    return { provider, sandboxId: branch.sandboxId };
}

async function ensurePixelraftDirectory(provider: Provider): Promise<void> {
    try {
        await provider.createDirectory({ args: { path: PIXELRAFT_DIRECTORY } });
    } catch {
    }
}

async function readJsonFile<T>(provider: Provider, filePath: string, fallback: T): Promise<T> {
    try {
        const result = await provider.readFile({ args: { path: filePath } });
        const content = result.file.toString();
        if (!content) {
            return fallback;
        }
        return JSON.parse(content) as T;
    } catch {
        return fallback;
    }
}

async function writeJsonFile(provider: Provider, filePath: string, data: unknown): Promise<void> {
    await ensurePixelraftDirectory(provider);
    await provider.writeFile({
        args: {
            path: filePath,
            content: JSON.stringify(data, null, 2),
            overwrite: true,
        },
    });
}

function detectExtensionFromMimeType(mimeType: string): string {
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('webp')) return 'webp';
    if (mimeType.includes('svg')) return 'svg';
    if (mimeType.includes('gif')) return 'gif';
    return 'jpg';
}

function parseDataUrl(dataUrl: string): { mimeType: string; data: Buffer } {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match || !match[1] || !match[2]) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid data URL payload',
        });
    }

    return {
        mimeType: match[1],
        data: Buffer.from(match[2], 'base64'),
    };
}

export const workspaceRouter = createTRPCRouter({
    getComments: protectedProcedure
        .input(
            z.object({
                branchId: z.string().uuid(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { provider } = await getBranchProvider({
                branchId: input.branchId,
                userId: ctx.user.id,
                db: ctx.db,
            });

            try {
                const comments = await readJsonFile<CollaborationComment[]>(provider, COMMENTS_FILE, []);
                return commentsSchema.parse(comments);
            } finally {
                await provider.destroy().catch(() => {
                });
            }
        }),

    addComment: protectedProcedure
        .input(
            z.object({
                branchId: z.string().uuid(),
                content: z.string().min(1).max(5000),
                targetFrameId: z.string().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { provider } = await getBranchProvider({
                branchId: input.branchId,
                userId: ctx.user.id,
                db: ctx.db,
            });

            try {
                const comments = commentsSchema.parse(
                    await readJsonFile<CollaborationComment[]>(provider, COMMENTS_FILE, []),
                );
                const now = new Date().toISOString();
                const newComment: CollaborationComment = {
                    id: uuidv4(),
                    content: input.content.trim(),
                    createdBy: ctx.user.id,
                    targetFrameId: input.targetFrameId ?? null,
                    resolved: false,
                    createdAt: now,
                    updatedAt: now,
                };

                comments.push(newComment);
                await writeJsonFile(provider, COMMENTS_FILE, comments);
                return newComment;
            } finally {
                await provider.destroy().catch(() => {
                });
            }
        }),

    setCommentResolved: protectedProcedure
        .input(
            z.object({
                branchId: z.string().uuid(),
                commentId: z.string(),
                resolved: z.boolean(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { provider } = await getBranchProvider({
                branchId: input.branchId,
                userId: ctx.user.id,
                db: ctx.db,
            });

            try {
                const comments = commentsSchema.parse(
                    await readJsonFile<CollaborationComment[]>(provider, COMMENTS_FILE, []),
                );
                const comment = comments.find((item) => item.id === input.commentId);

                if (!comment) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Comment not found',
                    });
                }

                comment.resolved = input.resolved;
                comment.updatedAt = new Date().toISOString();
                await writeJsonFile(provider, COMMENTS_FILE, comments);
                return comment;
            } finally {
                await provider.destroy().catch(() => {
                });
            }
        }),

    deleteComment: protectedProcedure
        .input(
            z.object({
                branchId: z.string().uuid(),
                commentId: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { provider } = await getBranchProvider({
                branchId: input.branchId,
                userId: ctx.user.id,
                db: ctx.db,
            });

            try {
                const comments = commentsSchema.parse(
                    await readJsonFile<CollaborationComment[]>(provider, COMMENTS_FILE, []),
                );
                const updatedComments = comments.filter((item) => item.id !== input.commentId);
                await writeJsonFile(provider, COMMENTS_FILE, updatedComments);
                return true;
            } finally {
                await provider.destroy().catch(() => {
                });
            }
        }),

    getMcpConfig: protectedProcedure
        .input(
            z.object({
                branchId: z.string().uuid(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { provider } = await getBranchProvider({
                branchId: input.branchId,
                userId: ctx.user.id,
                db: ctx.db,
            });

            try {
                const config = await readJsonFile<McpConfig>(provider, MCP_FILE, defaultMcpConfig);
                return mcpConfigSchema.parse(config);
            } finally {
                await provider.destroy().catch(() => {
                });
            }
        }),

    saveMcpConfig: protectedProcedure
        .input(
            z.object({
                branchId: z.string().uuid(),
                config: mcpConfigSchema,
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { provider } = await getBranchProvider({
                branchId: input.branchId,
                userId: ctx.user.id,
                db: ctx.db,
            });

            try {
                const config = {
                    ...input.config,
                    updatedAt: new Date().toISOString(),
                    updatedBy: ctx.user.id,
                };
                await writeJsonFile(provider, MCP_FILE, config);
                return config;
            } finally {
                await provider.destroy().catch(() => {
                });
            }
        }),

    runMcpCommand: protectedProcedure
        .input(
            z.object({
                branchId: z.string().uuid(),
                command: z.string().optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { provider } = await getBranchProvider({
                branchId: input.branchId,
                userId: ctx.user.id,
                db: ctx.db,
            });

            try {
                const config = mcpConfigSchema.parse(
                    await readJsonFile<McpConfig>(provider, MCP_FILE, defaultMcpConfig),
                );

                const command = input.command?.trim() || [config.command, ...config.args].join(' ').trim();
                if (!command) {
                    throw new TRPCError({
                        code: 'BAD_REQUEST',
                        message: 'No MCP command configured',
                    });
                }

                const result = await provider.runCommand({
                    args: {
                        command,
                    },
                });

                return {
                    command,
                    output: result.output,
                };
            } finally {
                await provider.destroy().catch(() => {
                });
            }
        }),

    saveImageToProjectAssets: protectedProcedure
        .input(
            z.object({
                branchId: z.string().uuid(),
                imageDataUrl: z.string().min(1),
                displayName: z.string().min(1).max(250),
                mimeType: z.string().min(1),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            const { provider } = await getBranchProvider({
                branchId: input.branchId,
                userId: ctx.user.id,
                db: ctx.db,
            });

            try {
                const parsed = parseDataUrl(input.imageDataUrl);
                const extension = detectExtensionFromMimeType(input.mimeType || parsed.mimeType);
                const baseName = sanitizeFilename(input.displayName.replace(/\.[^.]+$/, '')) || 'image';
                const fileName = `${baseName}-${Date.now()}.${extension}`;
                const assetDirectory = '/public/pixelraft-assets';
                const assetPath = `${assetDirectory}/${fileName}`;

                try {
                    await provider.createDirectory({ args: { path: assetDirectory } });
                } catch {
                }

                await provider.writeFile({
                    args: {
                        path: assetPath,
                        content: new Uint8Array(parsed.data),
                        overwrite: true,
                    },
                });

                return {
                    path: assetPath,
                    publicPath: `/pixelraft-assets/${fileName}`,
                    fileName,
                };
            } finally {
                await provider.destroy().catch(() => {
                });
            }
        }),
});
