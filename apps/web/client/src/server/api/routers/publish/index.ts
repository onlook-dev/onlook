import { previewDomains, type PreviewDomain } from '@onlook/db';
import {
    PublishType
} from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../../trpc";
import { deployFreestyle } from './deploy.ts';
import { forkBuildSandbox } from './fork';
import { PublishManager } from './manager.ts';

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


        // Run domain check

        let foundPreviewDomains: PreviewDomain[] = [];

        if (type === PublishType.PREVIEW) {
            foundPreviewDomains = await ctx.db.query.previewDomains.findMany({
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

        // Deploy to Freestyle
        const urls = type === PublishType.PREVIEW ? foundPreviewDomains.map(domain => domain.fullDomain) : [];

        const session = await forkBuildSandbox(sandboxId, userId);
        const publishManager = new PublishManager(session);

        // Run build process

        const {
            success,
            files
        } = await publishManager.publish({
            skipBadge: false,
            skipBuild: false,
            buildScript,
            buildFlags,
            envVars,
        });

        if (!success) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to build project',
            });
        }

        // Deploy to Freestyle
        deployFreestyle({
            files,
            urls,
            envVars,
        });
    }),

    unpublish: publicProcedure.input(z.object({
        type: z.nativeEnum(PublishType),
        projectId: z.string(),
        urls: z.array(z.string()),
    })).mutation(async ({ ctx, input }) => {
        const { projectId, urls } = input;

        // Run domain check

        // Delete deployment
        deployFreestyle({
            files: {},
            urls,
            envVars: {},
        });
    }),
});

