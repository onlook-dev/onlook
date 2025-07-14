import type { WebSocketSession } from '@codesandbox/sdk';
import { DefaultSettings } from '@onlook/constants';
import type { DrizzleDb } from '@onlook/db/src/client';
import type { Deployment } from '@onlook/db/src/schema/project/deployment';
import {
    DeploymentStatus,
    DeploymentType
} from '@onlook/models';
import { PublishManager } from '../manager';
import { deployFreestyle } from './deploy';
import { forkBuildSandbox } from './fork';
import { getProjectUrls, getSandboxId, updateDeployment } from './helpers';

export async function publish({
    db,
    deployment,
}: {
    db: DrizzleDb;
    deployment: Deployment;
}) {
    const { id: deploymentId, projectId, type, buildScript, buildFlags, envVars, requestedBy: userId } = deployment;
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
                skipBadge: type === DeploymentType.CUSTOM,
                buildScript: buildScript ?? DefaultSettings.COMMANDS.build,
                buildFlags: buildFlags ?? DefaultSettings.EDITOR_SETTINGS.buildFlags,
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
                envVars: envVars ?? {},
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
