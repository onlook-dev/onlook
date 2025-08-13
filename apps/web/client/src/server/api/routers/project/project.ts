import { trackEvent } from '@/utils/analytics/server';
import { initModel } from '@onlook/ai';
import {
    canvases,
    createDefaultCanvas,
    createDefaultFrame,
    createDefaultUserCanvas,
    frames,
    projectCreateRequestInsertSchema,
    projectCreateRequests,
    projectInsertSchema,
    projects,
    projectUpdateSchema,
    toCanvas,
    toFrame,
    toProject,
    userCanvases,
    userProjects,
    type Canvas,
    type UserCanvas
} from '@onlook/db';
import { LLMProvider, OPENROUTER_MODELS, ProjectCreateRequestStatus, ProjectRole } from '@onlook/models';
import { generateText } from 'ai';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { projectCreateRequestRouter } from './createRequest';

export const projectRouter = createTRPCRouter({
    createRequest: projectCreateRequestRouter,
    list: protectedProcedure
        .input(z.object({
            limit: z.number().optional(),
            excludeProjectId: z.string().optional(),
        }).optional())
        .query(async ({ ctx, input }) => {
            const fetchedUserProjects = await ctx.db.query.userProjects.findMany({
                where: input?.excludeProjectId ? and(
                    eq(userProjects.userId, ctx.user.id),
                    ne(userProjects.projectId, input.excludeProjectId),
                ) : eq(userProjects.userId, ctx.user.id),
                with: {
                    project: true,
                },
                limit: input?.limit,
            });
            return fetchedUserProjects.map((userProject) => toProject(userProject.project)).sort((a, b) => new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime());
        }),
    get: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            const project = await ctx.db.query.projects.findFirst({
                where: eq(projects.id, input.projectId),
            });
            if (!project) {
                console.error('project not found');
                return null;
            }
            return toProject(project)
        }),
    getProjectWithCanvas: protectedProcedure
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
        .input(z.object({
            project: projectInsertSchema,
            userId: z.string(),
            creationData: projectCreateRequestInsertSchema
                .omit({
                    projectId: true,
                })
                .optional(),
        }))
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

                const newUserCanvas = createDefaultUserCanvas(input.userId, newCanvas.id, {
                    x: '120',
                    y: '120',
                    scale: '0.56',
                });
                await tx.insert(userCanvases).values(newUserCanvas);

                // 4. Create the default frame
                const desktopFrame = createDefaultFrame(newCanvas.id, input.project.sandboxUrl, {
                    x: '5',
                    y: '0',
                    width: '1536',
                    height: '960',
                });
                await tx.insert(frames).values(desktopFrame);
                const mobileFrame = createDefaultFrame(newCanvas.id, input.project.sandboxUrl, {
                    x: '1600',
                    y: '0',
                    width: '440',
                    height: '956',
                });
                await tx.insert(frames).values(mobileFrame);

                // 5. Create the creation request
                if (input.creationData) {
                    await tx.insert(projectCreateRequests).values({
                        ...input.creationData,
                        status: ProjectCreateRequestStatus.PENDING,
                        projectId: newProject.id,
                    });
                }

                trackEvent({
                    distinctId: input.userId,
                    event: 'user_create_project',
                    properties: {
                        projectId: newProject.id,
                    },
                });
                return newProject;
            });
        }),
    generateName: protectedProcedure
        .input(z.object({
            prompt: z.string(),
        }))
        .mutation(async ({ input }): Promise<string> => {
            try {
                const { model, providerOptions, headers } = await initModel({
                    provider: LLMProvider.OPENROUTER,
                    model: OPENROUTER_MODELS.CLAUDE_4_SONNET,
                });

                const MAX_NAME_LENGTH = 50;
                const result = await generateText({
                    model,
                    headers,
                    prompt: `Generate a concise and meaningful project name (2-4 words maximum) that reflects the main purpose or theme of the project based on user's creation prompt. Generate only the project name, nothing else. Keep it short and descriptive. User's creation prompt: <prompt>${input.prompt}</prompt>`,
                    providerOptions,
                    maxTokens: 50,
                });

                const generatedName = result.text.trim();
                if (generatedName && generatedName.length > 0 && generatedName.length <= MAX_NAME_LENGTH) {
                    return generatedName;
                }

                return 'New Project';
            } catch (error) {
                console.error('Error generating project name:', error);
                return 'New Project';
            }
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
    update: protectedProcedure.input(z.object({
        id: z.string(),
        project: projectUpdateSchema,
    })).mutation(async ({ ctx, input }) => {
        await ctx.db.update(projects).set(input.project).where(eq(projects.id, input.id));
    }),
});
