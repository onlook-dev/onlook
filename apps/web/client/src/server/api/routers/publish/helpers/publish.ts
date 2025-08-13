import { DefaultSettings } from '@onlook/constants';
import type { DrizzleDb } from '@onlook/db/src/client';
import type { Deployment } from '@onlook/db/src/schema/project/deployment';
import { DeploymentStatus, DeploymentType } from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { PublishManager } from '../manager';
import { deployFreestyle } from './deploy';
import { extractEnvVarsFromSandbox } from './env';
import { forkBuildSandbox } from './fork';
import { getProjectUrls, getSandboxId, updateDeployment } from './helpers';

export async function publish({ db, deployment }: { db: DrizzleDb; deployment: Deployment }) {
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
        const sandboxId = await getSandboxId(db, projectId);

        const updateDeploymentResult1 = await updateDeployment(db, deploymentId, {
            status: DeploymentStatus.IN_PROGRESS,
            message: 'Creating build environment...',
            progress: 10,
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
            const updateDeploymentResult2 = await updateDeployment(db, deploymentId, {
                status: DeploymentStatus.IN_PROGRESS,
                message: 'Creating optimized build...',
                progress: 20,
                sandboxId: forkedSandboxId,
            });
            if (!updateDeploymentResult2) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'Update deployment failed',
                });
            }

            const publishManager = new PublishManager(provider);
            const files = await publishManager.publish({
                skipBadge: type === DeploymentType.CUSTOM,
                buildScript: buildScript ?? DefaultSettings.COMMANDS.build,
                buildFlags: buildFlags ?? DefaultSettings.EDITOR_SETTINGS.buildFlags,
                updateDeployment: (deployment) => updateDeployment(db, deploymentId, deployment),
            });

            const updateDeploymentResult3 = await updateDeployment(db, deploymentId, {
                status: DeploymentStatus.IN_PROGRESS,
                message: 'Deploying build...',
                progress: 80,
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
        await updateDeployment(db, deploymentId, {
            status: DeploymentStatus.FAILED,
            error: error instanceof Error ? error.message : 'Unknown error',
            progress: 100,
        });
        throw error;
    }
}
