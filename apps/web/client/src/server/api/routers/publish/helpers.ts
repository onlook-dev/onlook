import type { WebSocketSession } from '@codesandbox/sdk';
import { deployments, deploymentUpdateSchema, previewDomains, projects, publishedDomains, type Deployment } from '@onlook/db';
import { type db as DrizzleDb } from '@onlook/db/src/client';
import {
    DeploymentStatus,
    DeploymentType,
    HostingProvider
} from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';
import {
    type FreestyleFile,
} from 'freestyle-sandboxes';
import { z } from "zod";
import { HostingProviderFactory } from '../domain/hosting-factory';
import { forkBuildSandbox } from './fork';
import { PublishManager } from './manager.ts';

export const deployFreestyle = async (
    {
        files,
        urls,
        envVars,
    }: {
        files: Record<string, FreestyleFile>,
        urls: string[],
        envVars?: Record<string, string>,
    }
): Promise<{
    success: boolean;
    message?: string;
}> => {
    const entrypoint = 'server.js';
    const adapter = HostingProviderFactory.create(HostingProvider.FREESTYLE);
    const deploymentFiles: Record<string, { content: string; encoding?: 'utf-8' | 'base64' }> = {};
    for (const [path, file] of Object.entries(files)) {
        deploymentFiles[path] = {
            content: file.content,
            encoding: (file.encoding === 'base64' ? 'base64' : 'utf-8')
        };
    }

    const result = await adapter.deploy({
        files: deploymentFiles,
        config: {
            domains: urls,
            entrypoint,
            envVars,
        },
    });

    if (!result.success) {
        throw new Error(result.message ?? 'Failed to deploy project');
    }

    return result;
}

export async function createDeployment(db: typeof DrizzleDb, projectId: string, type: DeploymentType, userId: string): Promise<Deployment> {
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
export async function publishInBackground({
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

    const { session, sandboxId: forkedSandboxId }: { session: WebSocketSession, sandboxId: string } = await forkBuildSandbox(sandboxId, userId, deploymentId);

    try {
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
            progress: 80,
        });

        await deployFreestyle({
            files,
            urls: deploymentUrls,
            envVars,
        });

        updateDeployment(db, deploymentId, {
            status: DeploymentStatus.COMPLETED,
            message: 'Deployment Success!',
            progress: 100,
        });
    } finally {
        await session.disconnect();
    }
}

export async function getProjectUrls(db: typeof DrizzleDb, projectId: string, type: DeploymentType): Promise<string[]> {
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

export async function getSandboxId(db: typeof DrizzleDb, projectId: string): Promise<string> {
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

export async function updateDeployment(db: typeof DrizzleDb, deploymentId: string, deployment: z.infer<typeof deploymentUpdateSchema>) {
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