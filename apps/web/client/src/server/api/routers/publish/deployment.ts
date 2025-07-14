import { deployments, deploymentUpdateSchema } from '@onlook/db';
import {
    DeploymentStatus,
    DeploymentType
} from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, or } from 'drizzle-orm';
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { updateDeployment } from './helpers';
import { createDeployment, publish } from './helpers/index.ts';

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
    create: protectedProcedure.input(z.object({
        projectId: z.string(),
        type: z.nativeEnum(DeploymentType),
        buildScript: z.string().optional(),
        buildFlags: z.string().optional(),
        envVars: z.record(z.string(), z.string()).optional(),
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
                or(
                    eq(deployments.status, DeploymentStatus.IN_PROGRESS),
                    eq(deployments.status, DeploymentStatus.PENDING),
                ),
            ),
        });
        if (existingDeployment) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message:
                    existingDeployment.status === DeploymentStatus.IN_PROGRESS ?
                        'Deployment in progress' :
                        'Deployment already exists',
            });
        }

        const deployment = await createDeployment(ctx.db, projectId, type, userId, buildScript, buildFlags, envVars);
        return { deploymentId: deployment.id };
    }),
    run: protectedProcedure.input(z.object({
        deploymentId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const { deploymentId } = input;
        const existingDeployment = await ctx.db.query.deployments.findFirst({
            where: and(
                eq(deployments.id, deploymentId),
                or(
                    eq(deployments.status, DeploymentStatus.IN_PROGRESS),
                    eq(deployments.status, DeploymentStatus.PENDING),
                ),
            ),
        });
        if (!existingDeployment) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Deployment not found',
            });
        }
        if (existingDeployment.status === DeploymentStatus.IN_PROGRESS) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Deployment in progress',
            });
        }
        publish({
            db: ctx.db,
            deployment: existingDeployment,
        })
    }),
});
