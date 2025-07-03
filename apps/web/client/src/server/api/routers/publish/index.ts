import { deployments } from '@onlook/db';
import {
    DeploymentStatus,
    DeploymentType
} from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { deploymentRouter } from './deployment';
import { createDeployment, deployFreestyle, getProjectUrls, publishInBackground, updateDeployment } from './helpers.ts';

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
