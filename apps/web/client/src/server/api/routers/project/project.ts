import {
    canvases,
    createDefaultCanvas, createDefaultFrame, createDefaultUserCanvas,
    frames,
    projectInsertSchema,
    projects,
    toCanvas,
    toFrame,
    toProject,
    userCanvases,
    userProjects,
    type Canvas,
    type UserCanvas
} from '@onlook/db';
import { ProjectRole } from '@onlook/models';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const projectRouter = createTRPCRouter({
    getFullProject: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            const project = await ctx.db.query.projects.findFirst({
                where: eq(projects.id, input.projectId),
                with: {
                    canvas: {
                        with: {
                            frames: true,
                            userCanvases: {
                                where: eq(userCanvases.userId, ctx.user.id),
                            },
                        },
                    },
                    conversations: {
                        orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
                        limit: 1,
                    },
                },
            });
            if (!project) {
                console.error('project not found');
                return null;
            }
            const canvas: Canvas = project.canvas ?? createDefaultCanvas(project.id);
            const userCanvas: UserCanvas = project.canvas?.userCanvases[0] ?? createDefaultUserCanvas(ctx.user.id, canvas.id);

            return {
                project: toProject(project),
                userCanvas: toCanvas(userCanvas),
                frames: project.canvas?.frames.map(toFrame) ?? [],
            };
        }),
    create: protectedProcedure
        .input(z.object({ project: projectInsertSchema, userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.db.transaction(async (tx) => {
                // 1. Insert the new project
                const [newProject] = await tx.insert(projects).values(input.project).returning();
                if (!newProject) {
                    throw new Error('Failed to create project in database');
                }

                // 2. Create the association in the junction table
                await tx.insert(userProjects).values({
                    userId: input.userId,
                    projectId: newProject.id,
                    role: ProjectRole.OWNER,
                });

                // 3. Create the default canvas
                const newCanvas = createDefaultCanvas(newProject.id);
                await tx.insert(canvases).values(newCanvas);

                const newUserCanvas = createDefaultUserCanvas(input.userId, newCanvas.id);
                await tx.insert(userCanvases).values(newUserCanvas);

                // 4. Create the default frame
                const newFrame = createDefaultFrame(newCanvas.id, input.project.sandboxUrl);
                await tx.insert(frames).values(newFrame);

                return newProject;
            });
        }),
    delete: protectedProcedure
        .input(z.object({ id: z.string() }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.transaction(async (tx) => {
                await tx.delete(projects).where(eq(projects.id, input.id));
                await tx.delete(userProjects).where(eq(userProjects.projectId, input.id));
            });
        }),
    getPreviewProjects: protectedProcedure
        .input(z.object({ userId: z.string() }))
        .query(async ({ ctx, input }) => {
            const projects = await ctx.db.query.userProjects.findMany({
                where: eq(userProjects.userId, input.userId),
                with: {
                    project: true,
                },
            });
            return projects.map((project) => toProject(project.project));
        }),
    update: protectedProcedure.input(projectInsertSchema).mutation(async ({ ctx, input }) => {
        if (!input.id) {
            throw new Error('Project ID is required');
        }
        await ctx.db.update(projects).set(input).where(eq(projects.id, input.id));
    }),
});
