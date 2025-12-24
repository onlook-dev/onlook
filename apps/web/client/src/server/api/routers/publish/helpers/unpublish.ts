import { type Deployment, type DrizzleDb } from '@onlook/db';
import {
    DeploymentStatus
} from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { deployFreestyle } from './deploy';
import { updateDeployment } from './helpers';

export const unpublish = async (db: DrizzleDb, deployment: Deployment, urls: string[]) => {
    if (!deployment) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Deployment not found',
        });
    }
    updateDeployment(db, {
        id: deployment.id,
        status: DeploymentStatus.IN_PROGRESS,
        message: 'Unpublishing project...',
        progress: 20,
        envVars: deployment.envVars ?? {},
    });

    try {
        await deployFreestyle({
            files: {},
            urls,
            envVars: {},
        });

        updateDeployment(db, {
            id: deployment.id,
            status: DeploymentStatus.COMPLETED,
            message: 'Project unpublished!',
            progress: 100,
            envVars: deployment.envVars ?? {},
        });
    } catch (error) {
        updateDeployment(db, {
            id: deployment.id,
            status: DeploymentStatus.FAILED,
            error: error instanceof Error ? error.message : 'Unknown error',
            progress: 100,
            envVars: deployment.envVars ?? {},
        });
        throw error;
    }
}
