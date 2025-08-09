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
import { addDeploymentLog, clearDeploymentLogs } from './logs';

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
        clearDeploymentLogs(deploymentId);
        addDeploymentLog(deploymentId, 'Starting deployment...', 'info');
        const deploymentUrls = await getProjectUrls(db, projectId, type);
        addDeploymentLog(deploymentId, `Resolved deployment URLs: ${deploymentUrls.join(', ')}`, 'debug');
        const sandboxId = await getSandboxId(db, projectId);
        addDeploymentLog(deploymentId, `Using sandbox ${sandboxId} for build`, 'debug');

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

        const { provider, sandboxId: forkedSandboxId } = await forkBuildSandbox(sandboxId, userId, deploymentId);
        addDeploymentLog(deploymentId, `Forked build sandbox: ${forkedSandboxId}`, 'info');

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
            addDeploymentLog(deploymentId, 'Building project inside sandbox...', 'info');
            const artifactUrl = await publishManager.buildAndUploadArtifact({
                skipBadge: type === DeploymentType.CUSTOM,
                buildScript: buildScript ?? DefaultSettings.COMMANDS.build,
                buildFlags: buildFlags ?? DefaultSettings.EDITOR_SETTINGS.buildFlags,
                deploymentId,
                updateDeployment: (deployment) => updateDeployment(db, deploymentId, deployment),
            });
            addDeploymentLog(deploymentId, `Build artifact uploaded. Signed URL generated.`, 'success');

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
            addDeploymentLog(deploymentId, `Extracted ${Object.keys(sandboxEnvVars).length} env vars from sandbox`, 'debug');
            const mergedEnvVars = { ...sandboxEnvVars, ...(envVars ?? {}) };
            addDeploymentLog(deploymentId, 'Starting deployment to hosting provider...', 'info');

            await deployFreestyle({
                sourceUrl: artifactUrl,
                urls: deploymentUrls,
                envVars: mergedEnvVars,
            });
            addDeploymentLog(deploymentId, 'Deployment finalized by hosting provider', 'success');
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
        addDeploymentLog(
            deploymentId,
            error instanceof Error ? error.message : 'Unknown error during deployment',
            'error',
        );
        throw error;
    }
}
