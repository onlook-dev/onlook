import { customDomainVerification, projectCustomDomains, ProjectCustomDomainStatus, toDomainInfoFromPublished, userProjects } from '@onlook/db';
import { VerificationRequestStatus } from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { verifyProjectAccess } from '../project/helper';

export const customRouter = createTRPCRouter({
    get: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ ctx, input }) => {
        await verifyProjectAccess(ctx.db, ctx.user.id, input.projectId);
        const customDomain = await ctx.db.query.projectCustomDomains.findFirst({
            where: eq(projectCustomDomains.projectId, input.projectId),
        });
        return customDomain ? toDomainInfoFromPublished(customDomain) : null;
    }),
    remove: protectedProcedure.input(z.object({
        domain: z.string(),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }): Promise<boolean> => {
        await verifyProjectAccess(ctx.db, ctx.user.id, input.projectId);
        try {
            await ctx.db.transaction(async (tx) => {
                // Scope the cancellation to the caller's project: `input.projectId`
                // was previously accepted but ignored, so the domain string alone
                // keyed the update — letting anyone cancel any project's domain.
                await tx.update(customDomainVerification).set({
                    status: VerificationRequestStatus.CANCELLED,
                }).where(and(
                    eq(customDomainVerification.fullDomain, input.domain),
                    eq(customDomainVerification.projectId, input.projectId),
                ));
                await tx.update(projectCustomDomains).set({
                    status: ProjectCustomDomainStatus.CANCELLED,
                }).where(and(
                    eq(projectCustomDomains.fullDomain, input.domain),
                    eq(projectCustomDomains.projectId, input.projectId),
                ));
            });
            return true;
        } catch (error) {
            throw new TRPCError({
                code: 'INTERNAL_SERVER_ERROR',
                message: `Failed to remove domain: ${error}`,
            });
        }
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