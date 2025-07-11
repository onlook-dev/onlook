import { projectCustomDomains, toDomainInfoFromPublished, userProjects } from '@onlook/db';
import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const customRouter = createTRPCRouter({
    get: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ ctx, input }) => {
        const customDomain = await ctx.db.query.projectCustomDomains.findFirst({
            where: eq(projectCustomDomains.projectId, input.projectId),
        });
        return customDomain ? toDomainInfoFromPublished(customDomain) : null;
    }),
    remove: protectedProcedure.input(z.object({
        domain: z.string(),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        await ctx.db.delete(projectCustomDomains).where(eq(projectCustomDomains.fullDomain, input.domain));
    }),
    getOwnedDomains: protectedProcedure.query(async ({ ctx }): Promise<string[]> => {
        const user = ctx.user;
        if (!user) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Unauthorized',
            });
        }

        const foundUserProjects = await ctx.db.query.userProjects.findMany({
            where: eq(userProjects.userId, user.id),
            with: {
                project: {
                    with: {
                        projectCustomDomains: true,
                    },
                }
            },
        });

        const ownedDomains = foundUserProjects.flatMap(
            userProject => userProject.project.projectCustomDomains.map(domain => domain.fullDomain),
        );
        return ownedDomains;
    }),
});