import { DefaultSettings } from '@onlook/constants';
import { type Deployment, type DrizzleDb } from '@onlook/db';
import { DeploymentStatus, DeploymentType } from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { PublishManager } from '../manager';
import { deployFreestyle } from './deploy';
import { extractEnvVarsFromSandbox } from './env';
import { forkBuildSandbox } from './fork';
import { getProjectUrls, updateDeployment } from './helpers';

export async function publish({
    db,
    deployment,
    sandboxId
}: {
    db: DrizzleDb;
    deployment: Deployment;
    sandboxId: string
}) {
    const {
        id: deploymentId,
        projectId,
        type,
        buildScript,
        buildFlags,
        envVars,
        requestedBy: userId,
    } = deployment;
    try {
        const deploymentUrls = await getProjectUrls(db, projectId, type);
        const updateDeploymentResult1 = await updateDeployment(db, {
            id: deploymentId,
            status: DeploymentStatus.IN_PROGRESS,
            message: 'Creating build environment...',
            progress: 10,
            envVars: deployment.envVars ?? {},
        });
        if (!updateDeploymentResult1) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Update deployment failed',
            });
        }

        const { provider, sandboxId: forkedSandboxId } = await forkBuildSandbox(
            sandboxId,
            userId,
            deploymentId,
        );

        try {
            const updateDeploymentResult2 = await updateDeployment(db, {
                id: deploymentId,
                status: DeploymentStatus.IN_PROGRESS,
                message: 'Creating optimized build...',
                progress: 20,
                sandboxId: forkedSandboxId,
                envVars: deployment.envVars ?? {},
            });
            if (!updateDeploymentResult2) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Update deployment failed',
                });
            }

            const publishManager = new PublishManager(provider);
            const files = await publishManager.publish({
                deploymentId,
                skipBadge: type === DeploymentType.CUSTOM,
                buildScript: buildScript ?? DefaultSettings.COMMANDS.build,
                buildFlags: buildFlags ?? DefaultSettings.EDITOR_SETTINGS.buildFlags,
                envVars: deployment.envVars ?? {},
                updateDeployment: (deploymentUpdate) => updateDeployment(db, deploymentUpdate),
            });

            const updateDeploymentResult3 = await updateDeployment(db, {
                id: deploymentId,
                status: DeploymentStatus.IN_PROGRESS,
                message: 'Deploying build...',
                progress: 80,
                envVars: deployment.envVars ?? {},
            });
            if (!updateDeploymentResult3) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Update deployment failed',
                });
            }

            // Note: Prefer user provided env vars over sandbox env vars
            const sandboxEnvVars = await extractEnvVarsFromSandbox(provider);
            const mergedEnvVars = { ...sandboxEnvVars, ...(envVars ?? {}) };

            await deployFreestyle({
                files,
                urls: deploymentUrls,
                envVars: mergedEnvVars,
            });
        } finally {
            await provider.destroy();
        }
    } catch (error) {
        console.error(error);
        await updateDeployment(db, {
            id: deploymentId,
            status: DeploymentStatus.FAILED,
            error: error instanceof Error ? error.message : 'Unknown error',
            progress: 100,
            envVars: deployment.envVars ?? {},
        });
        throw error;
    }
}
