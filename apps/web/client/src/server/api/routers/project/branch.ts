import { CodeProvider, getStaticCodeProvider } from '@onlook/code-provider';
import { getSandboxPreviewUrl, SandboxTemplates, Templates } from '@onlook/constants';
import { branches, branchInsertSchema, branchUpdateSchema, canvases, createDefaultFrame, frames, fromDbBranch, fromDbFrame } from '@onlook/db';
import type { Frame } from '@onlook/models';
import { calculateNonOverlappingPosition, generateUniqueBranchName } from '@onlook/utility';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { extractCsbPort } from './helper';

// Helper function to get existing frames in a canvas
async function getExistingFrames(tx: any, canvasId: string): Promise<Frame[]> {
    const dbFrames = await tx.query.frames.findMany({
        where: eq(frames.canvasId, canvasId),
    });
    return dbFrames.map(fromDbFrame);
}

export const branchRouter = createTRPCRouter({
    getByProjectId: protectedProcedure
        .input(
            z.object({
                projectId: z.string(),
                onlyDefault: z.boolean().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const dbBranches = await ctx.db.query.branches.findMany({
                where: input.onlyDefault ?
                    and(eq(branches.isDefault, true), eq(branches.projectId, input.projectId)) :
                    eq(branches.projectId, input.projectId),
            });
            // TODO: Create a default branch if none exists for backwards compatibility

            if (!dbBranches || dbBranches.length === 0) {
                throw new TRPCError({
                    code: 'NOT_FOUND',
                    message: 'Branches not found',
                });
            }
            return dbBranches.map(fromDbBranch);
        }),
    create: protectedProcedure
        .input(branchInsertSchema)
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.db.insert(branches).values(input);
                return true;
            } catch (error) {
                console.error('Error creating branch', error);
                return false;
            }
        }),
    update: protectedProcedure.input(branchUpdateSchema).mutation(async ({ ctx, input }) => {
        try {
            await ctx.db
                .update(branches)
                .set({ ...input, updatedAt: new Date() })
                .where(
                    eq(branches.id, input.id)
                );
            return true;
        } catch (error) {
            console.error('Error updating branch', error);
            return false;
        }
    }),
    delete: protectedProcedure
        .input(
            z.object({
                branchId: z.string().uuid(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.db.delete(branches).where(eq(branches.id, input.branchId));
                return true;
            } catch (error) {
                console.error('Error deleting branch', error);
                return false;
            }
        }),
    fork: protectedProcedure
        .input(
            z.object({
                branchId: z.uuid(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            try {
                // Get source branch with its frames to extract port
                const sourceBranch = await ctx.db.query.branches.findFirst({
                    where: eq(branches.id, input.branchId),
                    with: {
                        frames: true,
                    },
                });

                if (!sourceBranch) {
                    throw new TRPCError({
                        code: 'NOT_FOUND',
                        message: 'Source branch not found',
                    });
                }

                // Get existing branch names for unique name generation
                const existingBranches = await ctx.db.query.branches.findMany({
                    where: eq(branches.projectId, sourceBranch.projectId),
                });
                const existingNames = existingBranches.map(branch => branch.name);

                // Generate unique branch name
                const branchName: string = generateUniqueBranchName(sourceBranch.name, existingNames);

                // Fork the sandbox using code provider
                const CodesandboxProvider = await getStaticCodeProvider(CodeProvider.CodeSandbox);
                const forkedSandbox = await CodesandboxProvider.createProject({
                    source: 'template',
                    id: sourceBranch.sandboxId,
                    title: branchName,
                    tags: ['fork'],
                });

                const sandboxId = forkedSandbox.id;
                // Extract port from source branch frames or fall back to 3000
                const port = extractCsbPort(sourceBranch.frames) ?? 3000;
                const previewUrl = getSandboxPreviewUrl(sandboxId, port);

                // Create new branch
                const newBranchId = uuidv4();
                const newBranch = {
                    id: newBranchId,
                    name: branchName,
                    description: null,
                    projectId: sourceBranch.projectId,
                    sandboxId,
                    isDefault: false,
                    gitBranch: null,
                    gitCommitSha: null,
                    gitRepoUrl: null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                return await ctx.db.transaction(async (tx) => {
                    await tx.insert(branches).values(newBranch);

                    // Always create at least one frame using the target branch's frame data
                    let createdFrames: Frame[] = [];

                    // Get the canvas for the project
                    const canvas = await tx.query.canvases.findFirst({
                        where: eq(canvases.projectId, sourceBranch.projectId),
                    });

                    if (canvas) {
                        // Get existing frames for smart positioning
                        const existingFrames = await getExistingFrames(tx, canvas.id);

                        // Use the first frame from the source branch as reference, or default dimensions
                        let frameWidth = 1200;
                        let frameHeight = 800;
                        let baseX = 100;
                        let baseY = 100;

                        if (sourceBranch.frames && sourceBranch.frames.length > 0 && sourceBranch.frames[0]) {
                            const sourceFrame = sourceBranch.frames[0];
                            frameWidth = parseInt(sourceFrame.width) || frameWidth;
                            frameHeight = parseInt(sourceFrame.height) || frameHeight;
                            baseX = parseInt(sourceFrame.x) || baseX;
                            baseY = parseInt(sourceFrame.y) || baseY;
                        }

                        // Create a proposed frame based on source frame dimensions
                        const proposedFrame: Frame = {
                            id: uuidv4(),
                            branchId: newBranchId,
                            canvasId: canvas.id,
                            position: {
                                x: baseX + frameWidth + 100, // Initial offset to the right
                                y: baseY,
                            },
                            dimension: {
                                width: frameWidth,
                                height: frameHeight,
                            },
                            url: previewUrl,
                        };

                        // Calculate non-overlapping position
                        const optimalPosition = calculateNonOverlappingPosition(proposedFrame, existingFrames);

                        const newFrame = createDefaultFrame({
                            canvasId: canvas.id,
                            branchId: newBranchId,
                            url: previewUrl,
                            overrides: {
                                x: optimalPosition.x.toString(),
                                y: optimalPosition.y.toString(),
                                width: frameWidth.toString(),
                                height: frameHeight.toString(),
                            },
                        });

                        await tx.insert(frames).values(newFrame);
                        createdFrames.push(fromDbFrame(newFrame));
                    }

                    return {
                        branch: fromDbBranch(newBranch),
                        frames: createdFrames,
                        sandboxId,
                        previewUrl,
                    };
                });
            } catch (error) {
                console.error('Error forking branch', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to fork branch',
                });
            }
        }),
    createBlank: protectedProcedure
        .input(
            z.object({
                projectId: z.string().uuid(),
                branchName: z.string().optional(),
                framePosition: z.object({
                    x: z.number(),
                    y: z.number(),
                    width: z.number(),
                    height: z.number(),
                }).optional(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            try {
                return await ctx.db.transaction(async (tx) => {
                    // Get existing branches with frames for unique name generation and port extraction
                    const existingBranches = await tx.query.branches.findMany({
                        where: eq(branches.projectId, input.projectId),
                        with: {
                            frames: true,
                        },
                    });
                    const existingNames = existingBranches.map(branch => branch.name);

                    // Generate unique branch name if not provided
                    const baseName = 'empty';
                    let branchName: string;
                    if (input.branchName) {
                        branchName = input.branchName;
                    } else {
                        branchName = generateUniqueBranchName(baseName, existingNames);
                    }

                    // Create new blank sandbox
                    const CodesandboxProvider = await getStaticCodeProvider(CodeProvider.CodeSandbox);
                    const blankSandbox = await CodesandboxProvider.createProject({
                        source: 'template',
                        id: SandboxTemplates[Templates.EMPTY_NEXTJS].id,
                        title: branchName,
                        tags: ['blank'],
                    });

                    const sandboxId = blankSandbox.id;
                    // Extract port from existing project frames or fall back to 3000
                    const allFrames = existingBranches.flatMap(branch => branch.frames || []);
                    const port = extractCsbPort(allFrames) ?? 3000;
                    const previewUrl = getSandboxPreviewUrl(sandboxId, port);

                    // Create new branch
                    const newBranchId = uuidv4();
                    const newBranch = {
                        id: newBranchId,
                        name: branchName,
                        description: null,
                        projectId: input.projectId,
                        sandboxId,
                        isDefault: false,
                        gitBranch: null,
                        gitCommitSha: null,
                        gitRepoUrl: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };

                    await tx.insert(branches).values(newBranch);

                    // Create new frame if position is provided
                    let createdFrames: Frame[] = [];
                    if (input.framePosition) {
                        // Get the canvas for the project
                        const canvas = await tx.query.canvases.findFirst({
                            where: eq(canvases.projectId, input.projectId),
                        });

                        if (canvas) {
                            // Get existing frames for smart positioning
                            const existingFrames = await getExistingFrames(tx, canvas.id);

                            // Create a proposed frame based on input position
                            const proposedFrame: Frame = {
                                id: uuidv4(),
                                branchId: newBranchId,
                                canvasId: canvas.id,
                                position: {
                                    x: input.framePosition.x + input.framePosition.width + 100, // Initial simple offset
                                    y: input.framePosition.y,
                                },
                                dimension: {
                                    width: input.framePosition.width,
                                    height: input.framePosition.height,
                                },
                                url: previewUrl,
                            };

                            // Calculate non-overlapping position
                            const optimalPosition = calculateNonOverlappingPosition(proposedFrame, existingFrames);

                            const newFrame = createDefaultFrame({
                                canvasId: canvas.id,
                                branchId: newBranchId,
                                url: previewUrl,
                                overrides: {
                                    x: optimalPosition.x.toString(),
                                    y: optimalPosition.y.toString(),
                                    width: input.framePosition.width.toString(),
                                    height: input.framePosition.height.toString(),
                                },
                            });

                            await tx.insert(frames).values(newFrame);
                            createdFrames.push(fromDbFrame(newFrame));
                        }
                    }

                    return {
                        branch: fromDbBranch(newBranch),
                        frames: createdFrames,
                        sandboxId,
                        previewUrl,
                    };
                });
            } catch (error) {
                console.error('Error creating blank sandbox', error);
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: error instanceof Error ? error.message : 'Failed to create blank sandbox',
                });
            }
        }),
});
