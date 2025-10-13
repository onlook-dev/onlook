import { protectedProcedure } from '@/server/api/trpc';
import { trackEvent } from '@/utils/analytics/server';
import { CodeProvider, getStaticCodeProvider } from '@onlook/code-provider';
import { getSandboxPreviewUrl, Tags } from '@onlook/constants';
import {
    branches,
    canvases,
    createDefaultCanvas,
    createDefaultFrame,
    createDefaultUserCanvas,
    DefaultFrameType,
    frames,
    projects,
    userCanvases,
    userProjects,
    type Branch,
    type Canvas,
    type Frame as DbFrame,
    type Project
} from '@onlook/db';
import { ProjectRole } from '@onlook/models';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

type ForkedBranch = {
    newBranch: Branch;
    newSandboxUrl: string;
};

type SourceProjectWithRelations = Project & {
    canvas?: {
        frames: (DbFrame & { branch?: Branch | null })[];
        userCanvases: any[];
    } | null;
    branches: Branch[];
};

/**
 * Validates that the source project exists and has branches
 */
function validateSourceProject(sourceProject: SourceProjectWithRelations | undefined): asserts sourceProject is SourceProjectWithRelations {
    if (!sourceProject) {
        throw new Error('Source project not found');
    }

    if (!sourceProject.branches || sourceProject.branches.length === 0) {
        throw new Error('Source project has no branches');
    }
}

/**
 * Forks all branches and creates sandbox projects for each
 */
async function forkAllBranches(
    sourceBranches: Branch[],
    sourceProjectName: string
): Promise<Map<string, ForkedBranch>> {
    const CodesandboxProvider = await getStaticCodeProvider(CodeProvider.CodeSandbox);
    const branchMapping = new Map<string, ForkedBranch>();

    for (const sourceBranch of sourceBranches) {
        if (!sourceBranch.sandboxId) {
            throw new Error(`Branch ${sourceBranch.name} has no sandbox ID`);
        }

        const newSandbox = await CodesandboxProvider.createProject({
            source: 'template',
            id: sourceBranch.sandboxId,
            title: `${sourceProjectName} (Fork) - ${sourceBranch.name}`,
            tags: ['template-fork'],
        });

        const newSandboxUrl = getSandboxPreviewUrl(newSandbox.id, 3000);
        const newBranch: Branch = {
            ...sourceBranch,
            id: uuidv4(),
            sandboxId: newSandbox.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        branchMapping.set(sourceBranch.id, {
            newBranch,
            newSandboxUrl,
        });
    }

    return branchMapping;
}

/**
 * Creates new project data from source project
 */
function createNewProjectData(sourceProject: SourceProjectWithRelations, customName?: string) {
    return {
        name: customName || `${sourceProject.name} (Copy)`,
        description: sourceProject.description,
        tags: sourceProject.tags?.filter(tag => tag !== Tags.TEMPLATE) ?? [],
        previewImgUrl: sourceProject.previewImgUrl,
        previewImgPath: sourceProject.previewImgPath,
        previewImgBucket: sourceProject.previewImgBucket,
        // Allows for the preview image to be updated
        updatedPreviewImgAt: null,
    };
}

/**
 * Creates frames mapped to their corresponding new branches, preserving original positions
 */
function createMappedFrames(
    sourceFrames: (DbFrame & { branch?: Branch | null })[],
    newCanvasId: string,
    branchMapping: Map<string, ForkedBranch>
): DbFrame[] {
    const newFrames: DbFrame[] = [];

    for (const frame of sourceFrames) {
        if (frame.branchId) {
            const branchMap = branchMapping.get(frame.branchId);
            if (branchMap) {
                newFrames.push({
                    ...frame,
                    id: uuidv4(),
                    canvasId: newCanvasId,
                    branchId: branchMap.newBranch.id,
                    url: branchMap.newSandboxUrl,
                });
            }
        }
    }

    return newFrames;
}

/**
 * Creates default frames for the default branch
 */
function createDefaultFramesForDefaultBranch(
    canvasId: string,
    branchMapping: Map<string, ForkedBranch>
): DbFrame[] {
    const defaultBranchMap = Array.from(branchMapping.values())
        .find(({ newBranch }) => newBranch.isDefault);

    if (!defaultBranchMap) {
        return [];
    }

    const desktopFrame = createDefaultFrame({
        canvasId,
        branchId: defaultBranchMap.newBranch.id,
        url: defaultBranchMap.newSandboxUrl,
        type: DefaultFrameType.DESKTOP,
    });

    return [desktopFrame];
}

export const fork = protectedProcedure
    .input(z.object({
        projectId: z.uuid(),
        name: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
        // 1. Get the source project with canvas, frames, and branches
        const sourceProject = await ctx.db.query.projects.findFirst({
            where: eq(projects.id, input.projectId),
            with: {
                canvas: {
                    with: {
                        frames: {
                            with: {
                                branch: true,
                            },
                        },
                        userCanvases: true,
                    },
                },
                branches: true,
            },
        }) as SourceProjectWithRelations | undefined;

        validateSourceProject(sourceProject);

        // 2. Fork all branches and create sandbox projects
        const branchMapping = await forkAllBranches(
            sourceProject.branches,
            sourceProject.name
        );

        // 3. Create the new project with forked data
        const newProjectData = createNewProjectData(sourceProject, input.name);

        return await ctx.db.transaction(async (tx) => {
            // Create the new project
            const [newProject] = await tx.insert(projects).values(newProjectData).returning();
            if (!newProject) {
                throw new Error('Failed to create project in database');
            }

            // Create all branches for the new project
            const newBranches = Array.from(branchMapping.values()).map(({ newBranch }) => ({
                ...newBranch,
                projectId: newProject.id,
            }));
            await tx.insert(branches).values(newBranches);

            // Create the user-project association
            await tx.insert(userProjects).values({
                userId: ctx.user.id,
                projectId: newProject.id,
                role: ProjectRole.OWNER,
            });

            // Handle canvas and frames
            const sourceCanvas = sourceProject.canvas;
            if (sourceCanvas) {
                // Create new canvas
                const newCanvas: Canvas = {
                    id: uuidv4(),
                    projectId: newProject.id
                };
                await tx.insert(canvases).values(newCanvas);

                // Create user canvas with default positioning
                const newUserCanvas = createDefaultUserCanvas(ctx.user.id, newCanvas.id, {
                    x: '120',
                    y: '120',
                    scale: '0.56',
                });
                await tx.insert(userCanvases).values(newUserCanvas);

                // Handle frames
                if (sourceCanvas.frames && sourceCanvas.frames.length > 0) {
                    const newFrames = createMappedFrames(
                        sourceCanvas.frames,
                        newCanvas.id,
                        branchMapping
                    );

                    if (newFrames.length > 0) {
                        await tx.insert(frames).values(newFrames);
                    }
                } else {
                    // Create default frames for default branch only
                    const defaultFrames = createDefaultFramesForDefaultBranch(
                        newCanvas.id,
                        branchMapping
                    );

                    if (defaultFrames.length > 0) {
                        await tx.insert(frames).values(defaultFrames);
                    }
                }
            } else {
                // Create default canvas and frames if source had none
                const newCanvas = createDefaultCanvas(newProject.id);
                await tx.insert(canvases).values(newCanvas);

                const newUserCanvas = createDefaultUserCanvas(ctx.user.id, newCanvas.id, {
                    x: '120',
                    y: '120',
                    scale: '0.56',
                });
                await tx.insert(userCanvases).values(newUserCanvas);

                // Create default frames for the default branch
                const defaultFrames = createDefaultFramesForDefaultBranch(
                    newCanvas.id,
                    branchMapping
                );

                if (defaultFrames.length > 0) {
                    await tx.insert(frames).values(defaultFrames);
                }
            }

            // Track the fork event
            const allSandboxIds = Array.from(branchMapping.values())
                .map(({ newBranch }) => newBranch.sandboxId);

            trackEvent({
                distinctId: ctx.user.id,
                event: 'user_fork_template',
                properties: {
                    sourceProjectId: input.projectId,
                    newProjectId: newProject.id,
                    sandboxIds: allSandboxIds,
                    branchCount: branchMapping.size,
                },
            });

            return newProject;
        });
    });