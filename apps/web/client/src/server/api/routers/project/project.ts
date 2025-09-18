import { env } from '@/env';
import { createTRPCRouter, protectedProcedure } from '@/server/api/trpc';
import { trackEvent } from '@/utils/analytics/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import { initModel } from '@onlook/ai';
import { getSandboxPreviewUrl, STORAGE_BUCKETS } from '@onlook/constants';
import {
    branches,
    canvases,
    conversations,
    createDefaultBranch,
    createDefaultCanvas,
    createDefaultConversation,
    createDefaultFrame,
    createDefaultUserCanvas,
    DefaultFrameType,
    frames,
    fromDbCanvas,
    fromDbFrame,
    fromDbProject,
    projectCreateRequestInsertSchema,
    projectCreateRequests,
    projectInsertSchema,
    projects,
    projectUpdateSchema,
    toDbPreviewImg,
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
import { extractCsbPort } from './helper';
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

                const branch = await ctx.db.query.branches.findFirst({
                    where: and(eq(branches.projectId, input.projectId), eq(branches.isDefault, true)),
                    with: {
                        frames: true,
                    },
                });

                if (!branch) {
                    throw new Error('Branch not found');
                }

                if (!branch.sandboxId) {
                    throw new Error('No sandbox found for branch');
                }

                // Extract port from existing frame URL or fall back to 3000
                const port = extractCsbPort(branch.frames) ?? 3000;
                const url = getSandboxPreviewUrl(branch.sandboxId, port);
                const app = new FirecrawlApp({ apiKey: env.FIRECRAWL_API_KEY });

                // Optional: Add actions to click the button for CSB free tier
                // const _csbFreeActions = [{
                //     type: 'click',
                //     selector: '#btn-answer-yes',
                // }];
                const result = await app.scrapeUrl(url, {
                    formats: ['screenshot'],
                    onlyMainContent: true,
                    timeout: 10000,
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

                const path = getScreenshotPath(input.projectId, finalMimeType);

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
                } = toDbPreviewImg({
                    type: 'storage',
                    storagePath: {
                        bucket: STORAGE_BUCKETS.PREVIEW_IMAGES,
                        path: data.path,
                    },
                    updatedAt: new Date(),
                });

                await ctx.db.update(projects)
                    .set({
                        previewImgUrl,
                        previewImgPath,
                        previewImgBucket,
                        updatedPreviewImgAt,
                        updatedAt: new Date(),
                    })
                    .where(eq(projects.id, input.projectId));

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
            return fetchedUserProjects.map((userProject) => fromDbProject(userProject.project)).sort((a, b) => new Date(b.metadata.updatedAt).getTime() - new Date(a.metadata.updatedAt).getTime());
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
            return fromDbProject(project)
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
                project: fromDbProject(project),
                userCanvas: fromDbCanvas(userCanvas),
                frames: project.canvas?.frames.map(fromDbFrame) ?? [],
            };
        }),
    create: protectedProcedure
        .input(z.object({
            project: projectInsertSchema,
            userId: z.string(),
            sandboxId: z.string(),
            sandboxUrl: z.string(),
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

                // 2. Create the default branch
                const newBranch = createDefaultBranch({
                    projectId: newProject.id,
                    sandboxId: input.sandboxId,
                });
                await tx.insert(branches).values(newBranch);

                // 3. Create the association in the junction table
                await tx.insert(userProjects).values({
                    userId: input.userId,
                    projectId: newProject.id,
                    role: ProjectRole.OWNER,
                });

                // 4. Create the default canvas
                const newCanvas = createDefaultCanvas(newProject.id);
                await tx.insert(canvases).values(newCanvas);

                const newUserCanvas = createDefaultUserCanvas(input.userId, newCanvas.id, {
                    x: '120',
                    y: '120',
                    scale: '0.56',
                });
                await tx.insert(userCanvases).values(newUserCanvas);

                // 5. Create the default frame
                const desktopFrame = createDefaultFrame({
                    canvasId: newCanvas.id,
                    branchId: newBranch.id,
                    url: input.sandboxUrl,
                    type: DefaultFrameType.DESKTOP,
                });
                await tx.insert(frames).values(desktopFrame);
                const mobileFrame = createDefaultFrame({
                    canvasId: newCanvas.id,
                    branchId: newBranch.id,
                    url: input.sandboxUrl,
                    type: DefaultFrameType.MOBILE,
                });
                await tx.insert(frames).values(mobileFrame);

                // 6. Create the default chat conversation
                await tx.insert(conversations).values(createDefaultConversation(newProject.id));

                // 7. Create the creation request
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
                    model: OPENROUTER_MODELS.OPEN_AI_GPT_5_NANO,
                });

                const MAX_NAME_LENGTH = 50;
                const result = await generateText({
                    model,
                    headers,
                    prompt: `Generate a concise and meaningful project name (2-4 words maximum) that reflects the main purpose or theme of the project based on user's creation prompt. Generate only the project name, nothing else. Keep it short and descriptive. User's creation prompt: <prompt>${input.prompt}</prompt>`,
                    providerOptions,
                    maxOutputTokens: 50,
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
            return projects.map((project) => fromDbProject(project.project));
        }),
    update: protectedProcedure.input(projectUpdateSchema).mutation(async ({ ctx, input }) => {
        const [updatedProject] = await ctx.db.update(projects).set({
            ...input,
            updatedAt: new Date(),
        }).where(
            eq(projects.id, input.id)
        ).returning();
        if (!updatedProject) {
            throw new Error('Project not found');
        }
        return fromDbProject(updatedProject);
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
    clone: protectedProcedure.input(z.object({
        projectId: z.string(),
        name: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
        // Get the source project with its default branch
        const sourceProject = await ctx.db.query.projects.findFirst({
            where: eq(projects.id, input.projectId),
            with: {
                userProjects: {
                    where: eq(userProjects.userId, ctx.user.id),
                },
            },
        });

        if (!sourceProject) {
            throw new Error('Project not found');
        }

        // Check if user has access to the source project
        if (sourceProject.userProjects.length === 0) {
            throw new Error('Access denied');
        }

        // Get all branches and canvas data from the source project
        const sourceBranches = await ctx.db.query.branches.findMany({
            where: eq(branches.projectId, input.projectId),
            with: {
                frames: true,
            },
        });

        // Get the canvas data to preserve positions
        const sourceCanvas = await ctx.db.query.canvases.findFirst({
            where: eq(canvases.projectId, input.projectId),
            with: {
                frames: true,
                userCanvases: {
                    where: eq(userCanvases.userId, ctx.user.id),
                },
            },
        });

        if (sourceBranches.length === 0) {
            throw new Error('Source project has no branches to clone');
        }

        // Find the default branch to use as the primary sandbox source
        const defaultBranch = sourceBranches.find(branch => branch.isDefault);
        if (!defaultBranch?.sandboxId) {
            throw new Error('Source project has no default branch with sandbox to clone');
        }

        return await ctx.db.transaction(async (tx) => {
            // 1. Fork sandboxes for all branches that have them
            const port = extractCsbPort(defaultBranch.frames) ?? 3000;
            
            // Import the sandbox fork function here since it's not exposed
            const { getStaticCodeProvider } = await import('@onlook/code-provider');
            const { CodeProvider } = await import('@onlook/code-provider');
            
            // Map to store new sandbox IDs for each branch
            const branchSandboxMap: Record<string, { sandboxId: string; previewUrl: string }> = {};
            
            try {
                const CodesandboxProvider = await getStaticCodeProvider(CodeProvider.CodeSandbox);
                
                // Clone sandbox for each branch that has one
                for (const sourceBranch of sourceBranches) {
                    if (sourceBranch.sandboxId) {
                        const clonedSandbox = await CodesandboxProvider.createProject({
                            source: 'sandbox',
                            id: sourceBranch.sandboxId,
                            title: `${input.name || sourceProject.name} (Clone) - ${sourceBranch.name}`,
                            tags: ['clone', ctx.user.id, sourceBranch.name],
                        });
                        
                        branchSandboxMap[sourceBranch.id] = {
                            sandboxId: clonedSandbox.id,
                            previewUrl: getSandboxPreviewUrl(clonedSandbox.id, port),
                        };
                    }
                }
            } catch (error) {
                console.error('Error cloning sandboxes:', error);
                throw new Error('Failed to clone sandboxes');
            }
            
            // Get the default branch's new sandbox info for main project creation
            const defaultBranchSandbox = branchSandboxMap[defaultBranch.id];
            if (!defaultBranchSandbox) {
                throw new Error('Failed to create sandbox for default branch');
            }

            // 2. Create the new project
            const clonedProjectData = {
                name: input.name || `${sourceProject.name} (Clone)`,
                description: sourceProject.description ? `${sourceProject.description} (Clone)` : 'Cloned project',
                tags: sourceProject.tags ? [...sourceProject.tags.filter(tag => tag !== 'template'), 'clone'] : ['clone'],
            };

            const [newProject] = await tx.insert(projects).values(clonedProjectData).returning();
            if (!newProject) {
                throw new Error('Failed to create cloned project in database');
            }

            // 3. Clone all branches from the source project
            const clonedBranches: typeof branches.$inferSelect[] = [];
            for (const sourceBranch of sourceBranches) {
                const branchSandbox = branchSandboxMap[sourceBranch.id];
                const newBranchData = {
                    id: crypto.randomUUID(),
                    projectId: newProject.id,
                    name: sourceBranch.name,
                    description: sourceBranch.description,
                    isDefault: sourceBranch.isDefault,
                    sandboxId: branchSandbox?.sandboxId || sourceBranch.sandboxId,
                    gitBranch: sourceBranch.gitBranch,
                    gitCommitSha: sourceBranch.gitCommitSha,
                    gitRepoUrl: sourceBranch.gitRepoUrl,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
                
                await tx.insert(branches).values(newBranchData);
                clonedBranches.push(newBranchData);
            }

            // 4. Create the association in the junction table
            await tx.insert(userProjects).values({
                userId: ctx.user.id,
                projectId: newProject.id,
                role: ProjectRole.OWNER,
            });

            // 5. Create the canvas (preserve source canvas settings if available)
            const newCanvas = sourceCanvas ? {
                id: crypto.randomUUID(),
                projectId: newProject.id,
                createdAt: new Date(),
                updatedAt: new Date(),
            } : createDefaultCanvas(newProject.id);
            await tx.insert(canvases).values(newCanvas);

            // Create user canvas with preserved settings if available
            const sourceUserCanvas = sourceCanvas?.userCanvases?.[0];
            const newUserCanvas = sourceUserCanvas ? {
                id: crypto.randomUUID(),
                userId: ctx.user.id,
                canvasId: newCanvas.id,
                x: sourceUserCanvas.x,
                y: sourceUserCanvas.y,
                scale: sourceUserCanvas.scale,
                createdAt: new Date(),
                updatedAt: new Date(),
            } : createDefaultUserCanvas(ctx.user.id, newCanvas.id, {
                x: '120',
                y: '120',
                scale: '0.56',
            });
            await tx.insert(userCanvases).values(newUserCanvas);

            // 6. Clone all frames from all branches with their positions preserved
            for (const sourceBranch of sourceBranches) {
                const clonedBranch = clonedBranches.find(cb => cb.name === sourceBranch.name);
                if (!clonedBranch) continue;

                // Get the new sandbox URL for this branch
                const branchSandbox = branchSandboxMap[sourceBranch.id];
                const frameUrl = branchSandbox?.previewUrl || defaultBranchSandbox.previewUrl;

                for (const sourceFrame of sourceBranch.frames) {
                    const newFrameData = {
                        id: crypto.randomUUID(),
                        canvasId: newCanvas.id,
                        branchId: clonedBranch.id,
                        url: frameUrl,
                        x: sourceFrame.x,
                        y: sourceFrame.y,
                        width: sourceFrame.width,
                        height: sourceFrame.height,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    };
                    
                    await tx.insert(frames).values(newFrameData);
                }
            }

            // 7. Create the default chat conversation
            await tx.insert(conversations).values(createDefaultConversation(newProject.id));

            trackEvent({
                distinctId: ctx.user.id,
                event: 'user_clone_project',
                properties: {
                    projectId: newProject.id,
                    sourceProjectId: input.projectId,
                },
            });

            return fromDbProject(newProject);
        });
    }),
});
