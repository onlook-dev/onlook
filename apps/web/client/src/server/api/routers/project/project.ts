import { env } from '@/env';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { trackEvent } from '@/utils/analytics/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { initModel } from '@onlook/ai';
import { STORAGE_BUCKETS } from '@onlook/constants';
import {
    canvases,
    createDefaultCanvas,
    createDefaultFrame,
    createDefaultUserCanvas,
    frames,
    fromPreviewImg,
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
import { compressImageServer } from '@onlook/image-server';
import { LLMProvider, OPENROUTER_MODELS, ProjectCreateRequestStatus, ProjectRole } from '@onlook/models';
import { getScreenshotPath } from '@onlook/utility';
import { generateText } from 'ai';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { projectCreateRequestRouter } from './createRequest';
import { forkTemplate } from './template';

export const projectRouter = createTRPCRouter({
    hasAccess: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            const user = ctx.user;
            const project = await ctx.db.query.projects.findFirst({
                where: eq(projects.id, input.projectId),
                with: {
                    userProjects: {
                        where: eq(userProjects.userId, user.id),
                    },
                },
            });
            return !!project && project.userProjects.length > 0;
        }),
    createRequest: projectCreateRequestRouter,
    captureScreenshot: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            try {
                if (!env.FIRECRAWL_API_KEY) {
                    throw new Error('FIRECRAWL_API_KEY is not configured');
                }

                const project = await ctx.db.query.projects.findFirst({
                    where: eq(projects.id, input.projectId),
                });

                if (!project) {
                    throw new Error('Project not found');
                }

                if (!project.sandboxUrl) {
                    throw new Error('No sandbox URL found');
                }

                const app = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });

                const result = await app.scrapeUrl(project.sandboxUrl, {
                    formats: ['screenshot'],
                    onlyMainContent: true,
                    timeout: 10000,
                    // Optional: Add actions to click the button for CSB free tier
                    // actions: [
                    //     {
                    //         type: 'click',
                    //         selector: '#btn-answer-yes',
                    //     },
                    // ],
                });

                if (!result.success) {
                    throw new Error(`Failed to scrape URL: ${result.error || 'Unknown error'}`);
                }

                const screenshotUrl = result.screenshot;

                if (!screenshotUrl) {
                    throw new Error('Invalid screenshot URL');
                }

                const response = await fetch(screenshotUrl, {
                    signal: AbortSignal.timeout(10000),
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch screenshot: ${response.status} ${response.statusText}`);
                }

                const arrayBuffer = await response.arrayBuffer();
                const mimeType = response.headers.get('content-type') ?? 'image/png';
                const buffer = Buffer.from(arrayBuffer);

                const compressedImage = await compressImageServer(buffer, undefined, {
                    quality: 80,
                    width: 1024,
                    height: 1024,
                    format: 'jpeg',
                });

                const useCompressed = !!compressedImage.buffer;
                const finalMimeType = useCompressed ? 'image/jpeg' : mimeType;
                const finalBuffer = useCompressed ? (compressedImage.buffer ?? buffer) : buffer;

                const path = getScreenshotPath(project.id, finalMimeType);

                const { data, error } = await ctx.supabase.storage
                    .from(STORAGE_BUCKETS.PREVIEW_IMAGES)
                    .upload(path, finalBuffer, {
                        contentType: finalMimeType,
                    });

                if (error) {
                    throw new Error(`Supabase upload error: ${error.message}`);
                }

                if (!data) {
                    throw new Error('No data returned from storage upload');
                }

                const {
                    previewImgUrl,
                    previewImgPath,
                    previewImgBucket,
                    updatedPreviewImgAt,
                } = fromPreviewImg({
                    type: 'storage',
                    storagePath: {
                        bucket: STORAGE_BUCKETS.PREVIEW_IMAGES,
                        path: data.path,
                    },
                });

                await ctx.db.update(projects)
                    .set({
                        previewImgUrl,
                        previewImgPath,
                        previewImgBucket,
                        updatedPreviewImgAt,
                        updatedAt: new Date(),
                    })
                    .where(eq(projects.id, project.id));

                return { success: true, path: data.path };
            } catch (error) {
                console.error('Error capturing project screenshot:', error);
                return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
            }
        }),
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
    forkTemplate,
    generateName: protectedProcedure
        .input(z.object({
            prompt: z.string(),
        }))
        .mutation(async ({ ctx, input }): Promise<string> => {
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
                    experimental_telemetry: {
                        isEnabled: true, metadata: {
                            userId: ctx.user.id,
                            tags: ['project-name-generation'],
                        }
                    },
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
        await ctx.db.update(projects).set({
            ...input.project,
            updatedAt: new Date(),
        }).where(eq(projects.id, input.id));
    }),
    addTag: protectedProcedure.input(z.object({
        projectId: z.string(),
        tag: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const project = await ctx.db.query.projects.findFirst({
            where: eq(projects.id, input.projectId),
        });

        if (!project) {
            throw new Error('Project not found');
        }

        const currentTags = project.tags ?? [];
        const newTags = currentTags.includes(input.tag)
            ? currentTags
            : [...currentTags, input.tag];

        await ctx.db.update(projects).set({
            tags: newTags,
            updatedAt: new Date(),
        }).where(eq(projects.id, input.projectId));

        return { success: true, tags: newTags };
    }),
    removeTag: protectedProcedure.input(z.object({
        projectId: z.string(),
        tag: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const project = await ctx.db.query.projects.findFirst({
            where: eq(projects.id, input.projectId),
        });

        if (!project) {
            throw new Error('Project not found');
        }

        const currentTags = project.tags ?? [];
        const newTags = currentTags.filter(tag => tag !== input.tag);

        await ctx.db.update(projects).set({
            tags: newTags,
            updatedAt: new Date(),
        }).where(eq(projects.id, input.projectId));

        return { success: true, tags: newTags };
    }),
});
