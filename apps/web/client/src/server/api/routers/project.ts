import { projectInsertSchema, projects, userProjects } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const projectRouter = createTRPCRouter({
    getById: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const project = await ctx.db.query.projects.findFirst({
                where: eq(projects.id, input.id),
            });
            return project;
        }),
    getByUserId: protectedProcedure
        .input(z.object({ id: z.string() }))
        .query(async ({ ctx, input }) => {
            const projects = await ctx.db.query.userProjects.findMany({
                where: eq(userProjects.userId, input.id),
                with: {
                    project: {
                        with: {
                            canvas: {
                                with: {
                                    frames: true,
                                },
                            },
                        },
                    },
                },
            });
            return projects;
        }),
    create: protectedProcedure.input(projectInsertSchema).mutation(async ({ ctx, input }) => {
        const project = await ctx.db.insert(projects).values(input).returning();
        return project[0];
    }),
    test: protectedProcedure.input(z.object({ name: z.string() })).mutation(async ({ ctx, input }) => {
        console.log('test', input);
        return input;
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
