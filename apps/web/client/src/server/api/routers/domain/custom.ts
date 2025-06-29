import { publishedDomains, toDomainInfoFromPublished } from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const customRouter = createTRPCRouter({
    get: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ ctx, input }) => {
        const customDomain = await ctx.db.query.publishedDomains.findFirst({
            where: eq(publishedDomains.projectId, input.projectId),
        });
        return customDomain ? toDomainInfoFromPublished(customDomain) : null;
    }),
    create: protectedProcedure.input(z.object({
        domain: z.string(),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const [customDomain] = await ctx.db.insert(publishedDomains).values({
            projectId: input.projectId,
            fullDomain: input.domain,
        }).returning();
        return customDomain ? toDomainInfoFromPublished(customDomain) : null;
    }),
    remove: protectedProcedure.input(z.object({
        domain: z.string(),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        await ctx.db.delete(publishedDomains).where(eq(publishedDomains.fullDomain, input.domain));
    }),
});