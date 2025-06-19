import { previewDomains, toDomainInfoFromPreview, toDomainInfoFromPublished } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { previewRouter } from './preview';
import { verificationRouter } from './verify';

export const domainRouter = createTRPCRouter({
    preview: previewRouter,
    verification: verificationRouter,
    getAll: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ ctx, input }) => {
        const preview = await ctx.db.query.previewDomains.findFirst({
            where: eq(previewDomains.projectId, input.projectId),
        });
        // const published = await ctx.db.query.publishedDomains.findFirst({
        //     where: eq(publishedDomains.projectId, input.projectId),
        // });

        const published = {
            id: '1',
            projectId: input.projectId,
            domainId: '1',
            fullDomain: 'kerbz.co.uk',
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'published',
        }
        return {
            preview: preview ? toDomainInfoFromPreview(preview) : null,
            published: published ? toDomainInfoFromPublished(published) : null,
        }
    }),
});
