import { customDomains, projectCustomDomains, projects, users, userProjects } from '@onlook/db/src/schema';
import { ProjectCustomDomainStatus } from '@onlook/db/src/schema/domain/custom/project-custom-domain';
import { ProjectRole } from '@onlook/models';
import { desc, asc, sql, eq, ilike, or, inArray, and } from 'drizzle-orm';
import { z } from 'zod';
import { adminProcedure, createTRPCRouter } from '../trpc';

export const domainsRouter = createTRPCRouter({
    listCustomDomains: adminProcedure
        .input(
            z.object({
                page: z.number().min(1).default(1),
                pageSize: z.number().min(1).max(100).default(20),
                sortBy: z.enum(['createdAt', 'verified', 'apexDomain']).default('createdAt'),
                sortOrder: z.enum(['asc', 'desc']).default('desc'),
                search: z.string().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { page, pageSize, sortBy, sortOrder, search } = input;
            const offset = (page - 1) * pageSize;

            // Build where conditions for search
            let whereConditions;
            if (search && search.trim()) {
                whereConditions = or(
                    ilike(customDomains.apexDomain, `%${search}%`),
                    sql`${customDomains.id}::text ilike ${`%${search}%`}`,
                );
            }

            // Determine sort column and direction
            let orderByClause;
            if (sortBy === 'createdAt') {
                orderByClause = sortOrder === 'asc' ? asc(customDomains.createdAt) : desc(customDomains.createdAt);
            } else if (sortBy === 'verified') {
                orderByClause = sortOrder === 'asc' ? asc(customDomains.verified) : desc(customDomains.verified);
            } else if (sortBy === 'apexDomain') {
                orderByClause = sortOrder === 'asc' ? asc(customDomains.apexDomain) : desc(customDomains.apexDomain);
            } else {
                orderByClause = desc(customDomains.createdAt);
            }

            // Fetch custom domains
            const domainsData = await ctx.db
                .select({
                    id: customDomains.id,
                    apexDomain: customDomains.apexDomain,
                    verified: customDomains.verified,
                    createdAt: customDomains.createdAt,
                    updatedAt: customDomains.updatedAt,
                })
                .from(customDomains)
                .where(whereConditions)
                .orderBy(orderByClause)
                .limit(pageSize)
                .offset(offset);

            // Get total count
            const countResult = await ctx.db
                .select({ count: sql<number>`cast(count(*) as int)` })
                .from(customDomains)
                .where(whereConditions);

            const count = countResult[0]?.count ?? 0;
            const totalPages = Math.ceil(count / pageSize);

            // Fetch project custom domains for these domains with owner info
            const domainIds = domainsData.map(d => d.id);
            let projectDomainsData: Array<{
                customDomainId: string;
                projectId: string;
                projectName: string;
                fullDomain: string;
                status: string;
                ownerId: string;
                ownerName: string | null;
                ownerFirstName: string | null;
                ownerLastName: string | null;
                ownerEmail: string | null;
            }> = [];

            if (domainIds.length > 0) {
                projectDomainsData = await ctx.db
                    .select({
                        customDomainId: projectCustomDomains.customDomainId,
                        projectId: projectCustomDomains.projectId,
                        projectName: projects.name,
                        fullDomain: projectCustomDomains.fullDomain,
                        status: projectCustomDomains.status,
                        ownerId: userProjects.userId,
                        ownerName: users.displayName,
                        ownerFirstName: users.firstName,
                        ownerLastName: users.lastName,
                        ownerEmail: users.email,
                    })
                    .from(projectCustomDomains)
                    .innerJoin(projects, eq(projectCustomDomains.projectId, projects.id))
                    .innerJoin(userProjects, and(
                        eq(userProjects.projectId, projects.id),
                        eq(userProjects.role, ProjectRole.OWNER)
                    ))
                    .innerJoin(users, eq(userProjects.userId, users.id))
                    .where(inArray(projectCustomDomains.customDomainId, domainIds));
            }

            // Create a map of domains to their projects
            const projectsByDomain = new Map<string, typeof projectDomainsData>();
            projectDomainsData.forEach(pd => {
                if (!projectsByDomain.has(pd.customDomainId)) {
                    projectsByDomain.set(pd.customDomainId, []);
                }
                projectsByDomain.get(pd.customDomainId)!.push(pd);
            });

            return {
                domains: domainsData.map(domain => {
                    const domainProjects = projectsByDomain.get(domain.id) || [];
                    return {
                        ...domain,
                        projects: domainProjects.map(p => ({
                            ...p,
                            ownerName: p.ownerName ||
                                `${p.ownerFirstName || ''} ${p.ownerLastName || ''}`.trim() ||
                                p.ownerEmail || '',
                        })),
                    };
                }),
                pagination: {
                    page,
                    pageSize,
                    totalCount: count,
                    totalPages,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
            };
        }),
});
