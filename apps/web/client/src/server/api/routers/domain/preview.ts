import { env } from '@/env';
import { previewDomains, toDomainInfoFromPreview } from '@onlook/db';
import { HOSTING_DOMAIN } from '@onlook/constants';
import { getValidSubdomain } from '@onlook/utility';
import { TRPCError } from '@trpc/server';
import { and, eq, ne } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const previewRouter = createTRPCRouter({
    get: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ ctx, input }) => {
        const preview = await ctx.db.query.previewDomains.findFirst({
            where: eq(previewDomains.projectId, input.projectId),
        });
        return preview ? toDomainInfoFromPreview(preview) : null;
    }),
    create: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        // Check if the domain is already taken by another project
        // This should never happen, but just in case
        const hostingDomain = env.NEXT_PUBLIC_HOSTING_DOMAIN || HOSTING_DOMAIN;
        const domain = `${getValidSubdomain(input.projectId)}.${hostingDomain}`;

        const existing = await ctx.db.query.previewDomains.findFirst({
            where: and(eq(previewDomains.fullDomain, domain), ne(previewDomains.projectId, input.projectId)),
        });

        if (existing) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: `Domain ${domain} already taken`,
            });
        }

        const [preview] = await ctx.db.insert(previewDomains).values({
            fullDomain: domain,
            projectId: input.projectId,
        }).onConflictDoUpdate({
            target: [previewDomains.fullDomain],
            set: {
                projectId: input.projectId,
            },
        })
            .returning({
                fullDomain: previewDomains.fullDomain,
            });

        if (!preview) {
            throw new TRPCError({
                code: 'BAD_REQUEST',
                message: 'Failed to create preview domain, no preview domain returned',
            });
        }

        return {
            domain: preview.fullDomain,
        }
    }),
});
