import { deployments, deploymentUpdateSchema } from '@onlook/db';
import {
    DeploymentType
} from '@onlook/models';
import { and, desc, eq } from 'drizzle-orm';
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { updateDeployment } from './helpers';

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
});
