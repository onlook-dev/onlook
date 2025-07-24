import { trackEvent } from '@/utils/analytics/server.ts';
import { deployments, type Deployment } from '@onlook/db';
import type { DrizzleDb } from '@onlook/db/src/client';
import {
    DeploymentStatus,
    DeploymentType,
    HostingProvider
} from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { randomUUID } from 'crypto';
import {
    type FreestyleFile,
} from 'freestyle-sandboxes';
import { HostingProviderFactory } from '../../domain/hosting-factory.ts';

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

export async function createDeployment(
    db: DrizzleDb,
    projectId: string,
    type: DeploymentType,
    userId: string,
    buildScript?: string,
    buildFlags?: string,
    envVars?: Record<string, string>,
): Promise<Deployment> {
    const [deployment] = await db.insert(deployments).values({
        id: randomUUID(),
        projectId,
        type,
        buildScript,
        buildFlags,
        envVars,
        status: DeploymentStatus.PENDING,
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

    trackEvent({
        distinctId: userId,
        event: 'user_deployed_project',
        properties: {
            type,
            projectId,
            deploymentId: deployment.id,
        },
    });

    return deployment;
}
