import { customDomains, customDomainVerification, userProjects, type CustomDomain } from '@onlook/db';
import type { DrizzleDb } from '@onlook/db/src/client';
import { VerificationRequestStatus } from '@onlook/models';
import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { parse } from 'psl';

export const ensureUserOwnsDomain = async (db: DrizzleDb, userId: string, domain: string): Promise<boolean> => {
    const foundUserProjects = await db.query.userProjects.findMany({
        where: eq(userProjects.userId, userId),
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
    return ownedDomains.includes(domain);
};

export const getCustomDomain = async (db: DrizzleDb, domain: string): Promise<{ customDomain: CustomDomain, subdomain: string | null }> => {
    const parsedDomain = parse(domain);
    if (parsedDomain.error) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: `Invalid domain: ${parsedDomain.error.message}`,
        });
    }

    if (!parsedDomain.domain) {
        throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Could not resolve apex domain',
        });
    }

    const apexDomain = parsedDomain.domain;
    const subdomain = parsedDomain.subdomain;

    const [customDomain] = await db
        .insert(customDomains)
        .values({
            apexDomain,
        })
        .onConflictDoUpdate({
            target: customDomains.apexDomain,
            set: {
                updatedAt: new Date(),
            },
        })
        .returning();

    if (!customDomain) {
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Failed to create or update domain',
        });
    }

    return { customDomain, subdomain };
}

export const getVerification = async (db: DrizzleDb, projectId: string, customDomainId: string) => {
    const verification = await db.query.customDomainVerification.findFirst({
        where: and(
            eq(customDomainVerification.customDomainId, customDomainId),
            eq(customDomainVerification.projectId, projectId),
            eq(customDomainVerification.status, VerificationRequestStatus.PENDING),
        ),
    });
    return verification;
}
