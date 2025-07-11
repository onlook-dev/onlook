import type { WebSocketSession } from '@codesandbox/sdk';
import type { DrizzleDb } from '@onlook/db/src/client';
import {
    DeploymentStatus,
    DeploymentType
} from '@onlook/models';
import { PublishManager } from '../manager';
import { deployFreestyle } from './deploy';
import { forkBuildSandbox } from './fork';
import { getProjectUrls, getSandboxId, updateDeployment } from './helpers';

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
    db: DrizzleDb;
    projectId: string;
    type: DeploymentType;
    buildScript: string;
    buildFlags: string;
    envVars: Record<string, string>;
}) {
    try {
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
    } catch (error) {
        updateDeployment(db, deploymentId, {
            status: DeploymentStatus.FAILED,
            error: error instanceof Error ? error.message : 'Unknown error',
            progress: 100,
        });
        throw error;
    }
}
