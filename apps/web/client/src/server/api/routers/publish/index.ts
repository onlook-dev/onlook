import {
    PublishType
} from '@onlook/models';
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { forkBuildSandbox } from './fork';
import { PublishManager } from './manager.ts';
import { previewDomains } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';

export const publishRouter = createTRPCRouter({
    publish: protectedProcedure.input(z.object({
        sandboxId: z.string(),
        projectId: z.string(),
        type: z.nativeEnum(PublishType),
        buildScript: z.string(),
        buildFlags: z.string(),
        envVars: z.record(z.string(), z.string()),
    })).mutation(async ({ ctx, input }) => {
        const {
            sandboxId,
            projectId,
            type,
            buildScript,
            buildFlags,
            envVars,
        } = input;

        const userId = ctx.user.id;

        // Get and check preview domain
        if (type === PublishType.PREVIEW) {
            const foundPreviewDomains = await ctx.db.query.previewDomains.findMany({
                where: eq(previewDomains.projectId, projectId),
            });
            if (!foundPreviewDomains || foundPreviewDomains.length === 0) {
                throw new TRPCError({
                    code: 'BAD_REQUEST',
                    message: 'No preview domain found',
                });
            }
        }



        // Fork sandbox
        // Open a connection
        // Run build process
        // Deploy to Freestyle
        const session = await forkBuildSandbox(sandboxId, userId);
        const publishManager = new PublishManager(session);
        const response = await publishManager.publish({
            type,
            projectId,
            buildScript,
            buildFlags,
            envVars,
        });



    }),

    unpublish: publicProcedure.input(z.object({
        projectId: z.string(),
        urls: z.array(z.string()),
    })).mutation(async ({ ctx, input }) => {
        const { projectId, urls } = input;

        // Delete deployment
    }),
});
