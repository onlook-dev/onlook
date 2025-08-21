import { protectedProcedure } from '@/server/api/trpc';
import { trackEvent } from '@/utils/analytics/server';
import { CodeProvider, createCodeProviderClient } from '@onlook/code-provider';
import { getSandboxPreviewUrl, Tags } from '@onlook/constants';
import {
    canvases,
    createDefaultCanvas,
    createDefaultFrame,
    createDefaultUserCanvas,
    frames,
    projects,
    userCanvases,
    userProjects,
    type Canvas,
    type Frame
} from '@onlook/db';
import { ProjectRole } from '@onlook/models';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

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

export const forkTemplate = protectedProcedure
    .input(z.object({
        projectId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
        // 1. Get the source project with canvas and frames
        const sourceProject = await ctx.db.query.projects.findFirst({
            where: eq(projects.id, input.projectId),
            with: {
                canvas: {
                    with: {
                        frames: true,
                        userCanvases: true,
                    },
                },
            },
        });

        if (!sourceProject) {
            throw new Error('Source project not found');
        }

        if (!sourceProject.sandboxId) {
            throw new Error('Source project has no sandbox ID');
        }

        // 2. Fork the sandbox
        const provider = await getProvider(sourceProject.sandboxId);
        const newSandbox = await provider.createProject({
            source: 'template',
            id: sourceProject.sandboxId,
            title: `${sourceProject.name} (Fork)`,
            tags: ['template-fork'],
        });
        await provider.destroy();
        const newSandboxUrl = getSandboxPreviewUrl(newSandbox.id, 3000);

        // 3. Create the new project with forked data
        const newProjectData = {
            name: `${sourceProject.name} (Copy)`,
            description: sourceProject.description,
            tags: sourceProject.tags?.filter(tag => tag !== Tags.TEMPLATE) ?? [],
            sandboxId: newSandbox.id,
            sandboxUrl: newSandboxUrl,
            previewImgUrl: sourceProject.previewImgUrl,
            previewImgPath: sourceProject.previewImgPath,
            previewImgBucket: sourceProject.previewImgBucket,
            // Allows for the preview image to be updated
            updatedPreviewImgAt: null,
        };

        return await ctx.db.transaction(async (tx) => {
            const [newProject] = await tx.insert(projects).values(newProjectData).returning();
            if (!newProject) {
                throw new Error('Failed to create project in database');
            }

            // 4. Create the association in the junction table
            await tx.insert(userProjects).values({
                userId: ctx.user.id,
                projectId: newProject.id,
                role: ProjectRole.OWNER,
            });

            // 5. Clone the canvas
            const sourceCanvas = sourceProject.canvas;
            if (sourceCanvas) {
                const newCanvas: Canvas = {
                    id: uuidv4(),
                    projectId: newProject.id
                };
                await tx.insert(canvases).values(newCanvas);

                // Clone user canvas settings (use default positioning for new user)
                const newUserCanvas = createDefaultUserCanvas(ctx.user.id, newCanvas.id, {
                    x: '120',
                    y: '120',
                    scale: '0.56',
                });
                await tx.insert(userCanvases).values(newUserCanvas);

                // 6. Clone the frames
                if (sourceCanvas.frames && sourceCanvas.frames.length > 0) {
                    const newFrames: Frame[] = sourceCanvas.frames.map(frame => ({
                        ...frame,
                        id: uuidv4(),
                        canvasId: newCanvas.id,
                        url: newSandboxUrl, // Update URL to point to new sandbox
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    }));
                    await tx.insert(frames).values(newFrames);
                } else {
                    // Create default frames if source had none
                    const desktopFrame = createDefaultFrame(newCanvas.id, newSandboxUrl, {
                        x: '5',
                        y: '0',
                        width: '1536',
                        height: '960',
                    });
                    await tx.insert(frames).values(desktopFrame);
                    const mobileFrame = createDefaultFrame(newCanvas.id, newSandboxUrl, {
                        x: '1600',
                        y: '0',
                        width: '440',
                        height: '956',
                    });
                    await tx.insert(frames).values(mobileFrame);
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

                const desktopFrame = createDefaultFrame(newCanvas.id, newSandboxUrl, {
                    x: '5',
                    y: '0',
                    width: '1536',
                    height: '960',
                });
                await tx.insert(frames).values(desktopFrame);
                const mobileFrame = createDefaultFrame(newCanvas.id, newSandboxUrl, {
                    x: '1600',
                    y: '0',
                    width: '440',
                    height: '956',
                });
                await tx.insert(frames).values(mobileFrame);
            }

            trackEvent({
                distinctId: ctx.user.id,
                event: 'user_fork_template',
                properties: {
                    sourceProjectId: input.projectId,
                    newProjectId: newProject.id,
                    sandboxId: newSandbox.id,
                },
            });

            return newProject;
        });
    });