import { previewDomains, projectCustomDomains, toDomainInfoFromPreview, toDomainInfoFromPublished } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { customRouter } from './custom';
import { previewRouter } from './preview';
import { verificationRouter } from './verify';

export const domainRouter = createTRPCRouter({
    preview: previewRouter,
    custom: customRouter,
    verification: verificationRouter,
    getAll: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ ctx, input }) => {
        const preview = await ctx.db.query.previewDomains.findFirst({
            where: eq(previewDomains.projectId, input.projectId),
        });
        const published = await ctx.db.query.projectCustomDomains.findFirst({
            where: eq(projectCustomDomains.projectId, input.projectId),
        });
        return {
            preview: preview ? toDomainInfoFromPreview(preview) : null,
            published: published ? toDomainInfoFromPublished(published) : null,
        }
    }),
});
