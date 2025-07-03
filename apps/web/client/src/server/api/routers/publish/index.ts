import { deployments, deploymentUpdateSchema, previewDomains, projects, publishedDomains, type Deployment } from '@onlook/db';
import { type db as DrizzleDb } from '@onlook/db/src/client';
import {
    DeploymentStatus,
    DeploymentType
} from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { deployFreestyle } from './deploy.ts';
import { forkBuildSandbox } from './fork';
import { PublishManager } from './manager.ts';

export const deploymentRouter = createTRPCRouter({
    getByType: protectedProcedure.input(z.object({
        projectId: z.string(),
        type: z.nativeEnum(DeploymentType),
    })).query(async ({ ctx, input }) => {
        const { projectId, type } = input;
        const deployment = await ctx.db.query.deployments.findFirst({
            where: and(eq(deployments.projectId, projectId), eq(deployments.type, type)),
            orderBy: desc(deployments.createdAt),
        });
        return deployment ?? null;
    }),
    update: protectedProcedure.input(z.object({
        deploymentId: z.string(),
        deployment: deploymentUpdateSchema
    })).mutation(async ({ ctx, input }) => {
        const { deploymentId, deployment } = input;
        return await updateDeployment(ctx.db, deploymentId, deployment);
    }),
});

export const publishRouter = createTRPCRouter({
    deployment: deploymentRouter,
    publish: protectedProcedure.input(z.object({
        projectId: z.string(),
        type: z.nativeEnum(DeploymentType),
        buildScript: z.string(),
        buildFlags: z.string(),
        envVars: z.record(z.string(), z.string()),
    })).mutation(async ({ ctx, input }) => {
        const {
            projectId,
            type,
            buildScript,
            buildFlags,
            envVars,
        } = input;

        const userId = ctx.user.id;

        const existingDeployment = await ctx.db.query.deployments.findFirst({
            where: and(eq(
                deployments.projectId, projectId),
                eq(deployments.type, type),
                eq(deployments.status, DeploymentStatus.IN_PROGRESS),
            ),
        });
        if (existingDeployment) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Deployment already exists',
            });
        }

        const deployment = await createDeployment(ctx.db, projectId, type, userId);

        publishInBackground({
            deploymentId: deployment.id,
            userId,
            db: ctx.db,
            projectId,
            type,
            buildScript,
            buildFlags,
            envVars,
        }).catch(error => {
            console.error(`Publish job ${deployment.id} failed:`, error);
            updateDeployment(ctx.db, deployment.id, {
                status: DeploymentStatus.FAILED,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
        });

        return { deploymentId: deployment.id };
    }),

    unpublish: protectedProcedure.input(z.object({
        type: z.nativeEnum(DeploymentType),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const { projectId, type } = input;
        const userId = ctx.user.id;
        const deployment = await createDeployment(ctx.db, projectId, type, userId);
        const urls = await getProjectUrls(ctx.db, projectId, type);

        updateDeployment(ctx.db, deployment.id, {
            status: DeploymentStatus.IN_PROGRESS,
            message: 'Unpublishing project...',
            progress: 20,
        });

        await deployFreestyle({
            files: {},
            urls,
            envVars: {},
        });

        updateDeployment(ctx.db, deployment.id, {
            status: DeploymentStatus.COMPLETED,
            message: 'Project unpublished',
            progress: 100,
        });

        return { deploymentId: deployment.id };
    }),
});

async function createDeployment(db: typeof DrizzleDb, projectId: string, type: DeploymentType, userId: string): Promise<Deployment> {
    const [deployment] = await db.insert(deployments).values({
        id: randomUUID(),
        projectId,
        type,
        status: DeploymentStatus.IN_PROGRESS,
        requestedBy: userId,
        message: 'Creating deployment...',
        progress: 0,
    }).returning();

    if (!deployment) {
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create deployment',
        });
    }

    return deployment;
}

// New function to handle background publishing
async function publishInBackground({
    deploymentId,
    userId,
    db,
    projectId,
    type,
    buildScript,
    buildFlags,
    envVars,
}: {
    deploymentId: string;
    userId: string;
    db: typeof DrizzleDb;
    projectId: string;
    type: DeploymentType;
    buildScript: string;
    buildFlags: string;
    envVars: Record<string, string>;
}) {
    const deploymentUrls = await getProjectUrls(db, projectId, type);
    const sandboxId = await getSandboxId(db, projectId);

    updateDeployment(db, deploymentId, {
        status: DeploymentStatus.IN_PROGRESS,
        message: 'Creating build environment...',
        progress: 10,
        urls: deploymentUrls,
    });

    const { session, sandboxId: forkedSandboxId } = await forkBuildSandbox(sandboxId, userId, deploymentId);

    updateDeployment(db, deploymentId, {
        status: DeploymentStatus.IN_PROGRESS,
        message: 'Creating optimized build...',
        progress: 20,
        sandboxId: forkedSandboxId,
    });

    const publishManager = new PublishManager(session);
    const files = await publishManager.publish({
        skipBadge: false,
        buildScript,
        buildFlags,
        envVars,
        updateDeployment: (deployment) => updateDeployment(db, deploymentId, deployment),
    });

    updateDeployment(db, deploymentId, {
        status: DeploymentStatus.IN_PROGRESS,
        message: 'Deploying build...',
        progress: 70,
    });

    await deployFreestyle({
        files,
        urls: deploymentUrls,
        envVars,
    });

    updateDeployment(db, deploymentId, {
        status: DeploymentStatus.COMPLETED,
        message: 'Cleaning up build environment...',
        progress: 90,
    });

    await session.disconnect();

    updateDeployment(db, deploymentId, {
        status: DeploymentStatus.COMPLETED,
        message: 'Deployment Success!',
        progress: 100,
    });
}

async function getProjectUrls(db: typeof DrizzleDb, projectId: string, type: DeploymentType): Promise<string[]> {
    let urls: string[] = [];
    if (type === DeploymentType.PREVIEW) {
        const foundPreviewDomains = await db.query.previewDomains.findMany({
            where: eq(previewDomains.projectId, projectId),
        });
        if (!foundPreviewDomains || foundPreviewDomains.length === 0) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'No preview domain found',
            });
        }
        urls = foundPreviewDomains.map(domain => domain.fullDomain);
    } else if (type === DeploymentType.CUSTOM) {
        const foundCustomDomains = await db.query.publishedDomains.findMany({
            where: eq(publishedDomains.projectId, projectId),
        });
        if (!foundCustomDomains || foundCustomDomains.length === 0) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'No custom domain found',
            });
        }
        urls = foundCustomDomains.map(domain => domain.fullDomain);
    } else {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Invalid publish type',
        });
    }
    return urls;
}

async function getSandboxId(db: typeof DrizzleDb, projectId: string): Promise<string> {
    const project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
    });
    if (!project) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Project not found',
        });
    }
    return project.sandboxId;
}

async function updateDeployment(db: typeof DrizzleDb, deploymentId: string, deployment: z.infer<typeof deploymentUpdateSchema>) {
    try {
        await db.update(deployments).set({
            ...deployment,
            type: deployment.type as DeploymentType,
            status: deployment.status as DeploymentStatus
        }).where(eq(deployments.id, deploymentId));
    } catch (error) {
        console.error(`Failed to update deployment ${deploymentId}:`, error);
    }
}