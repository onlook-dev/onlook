import {
    DeploymentType
} from '@onlook/models';
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../../trpc";
import { deploymentRouter } from './deployment';
import { createDeployment, getProjectUrls, unpublish } from './helpers/index.ts';

export const publishRouter = createTRPCRouter({
    deployment: deploymentRouter,
    unpublish: protectedProcedure.input(z.object({
        type: z.enum(DeploymentType),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const { projectId, type } = input;
        const userId = ctx.user.id;
        const deployment = await createDeployment({
            db: ctx.db,
            projectId,
            type,
            userId,
            sandboxId: '', // not used for unpublish
        });
        const urls = await getProjectUrls(ctx.db, projectId, type);
        await unpublish(
            ctx.db,
            deployment,
            urls,
        );
        return { deploymentId: deployment.id };
    }),
});
