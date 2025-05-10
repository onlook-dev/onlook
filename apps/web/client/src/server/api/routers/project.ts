import { conversations, createDefaultCanvas, projectInsertSchema, projects, toCanvas, toConversation, toFrame, toProject, userProjects, type Canvas } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const projectRouter = createTRPCRouter({
    getFullProjectById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const project = await ctx.db.query.projects.findFirst({
                where: eq(projects.id, input.id),
                with: {
                    canvas: {
                        with: {
                            frames: true,
                        },
                    },
                },
            });
            if (!project) {
                console.error('project not found');
                return null;
            }
            const canvas: Canvas = project.canvas ? project.canvas : createDefaultCanvas(project.id);
            return {
                project: toProject(project),
                canvas: toCanvas(canvas),
                frames: project.canvas?.frames.map(toFrame) ?? [],
            }
        }),
    getConversationsByProjectId: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const dbConversations = await ctx.db.query.conversations.findMany({
                where: eq(conversations.projectId, input.id),
                with: {
                    messages: true,
                },
            });
            return dbConversations.map((conversation) => toConversation(conversation, conversation.messages));
        }),
    getPreviewProjectsByUserId: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const projects = await ctx.db.query.userProjects.findMany({
                where: eq(userProjects.userId, input.id),
                with: {
                    project: true,
                },
            });
            return projects.map((project) => toProject(project.project));
        }),
    create: protectedProcedure.input(projectInsertSchema).mutation(async ({ ctx, input }) => {
        const project = await ctx.db.insert(projects).values(input).returning();
        return project[0];
    }),
    createUserProject: protectedProcedure
        .input(z.object({ project: projectInsertSchema, userId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.db.transaction(async (tx) => {
                // 1. Insert the new project
                const [newProject] = await tx.insert(projects).values(input.project).returning();

                if (!newProject) {
                    throw new Error('Failed to create project');
                }

                // 2. Create the association in the junction table
                await tx.insert(userProjects).values({
                    userId: input.userId,
                    projectId: newProject.id,
                });

                return newProject;
            });
        }),
});
