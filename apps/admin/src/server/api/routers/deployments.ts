import { deployments, projects, users, previewDomains, projectCustomDomains } from '@onlook/db/src/schema';
import { ProjectCustomDomainStatus } from '@onlook/db/src/schema/domain/custom/project-custom-domain';
import { desc, asc, sql, eq, ilike, or, inArray, and } from 'drizzle-orm';
import { z } from 'zod';
import { adminProcedure, createTRPCRouter } from '../trpc';

export const deploymentsRouter = createTRPCRouter({
    list: adminProcedure
        .input(
            z.object({
                page: z.number().min(1).default(1),
                pageSize: z.number().min(1).max(100).default(20),
                sortBy: z.enum(['createdAt', 'status', 'type']).default('createdAt'),
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
                    ilike(projects.name, `%${search}%`),
                    ilike(users.email, `%${search}%`),
                    ilike(users.displayName, `%${search}%`),
                    sql`${deployments.id}::text ilike ${`%${search}%`}`,
                );
            }

            // Determine sort column and direction
            let orderByClause;
            if (sortBy === 'createdAt') {
                orderByClause = sortOrder === 'asc' ? asc(deployments.createdAt) : desc(deployments.createdAt);
            } else if (sortBy === 'status') {
                orderByClause = sortOrder === 'asc' ? asc(deployments.status) : desc(deployments.status);
            } else if (sortBy === 'type') {
                orderByClause = sortOrder === 'asc' ? asc(deployments.type) : desc(deployments.type);
            } else {
                orderByClause = desc(deployments.createdAt);
            }

            // Fetch deployments with related data
            const deploymentsData = await ctx.db
                .select({
                    id: deployments.id,
                    projectId: deployments.projectId,
                    projectName: projects.name,
                    requestedById: deployments.requestedBy,
                    requestedByName: users.displayName,
                    requestedByFirstName: users.firstName,
                    requestedByLastName: users.lastName,
                    requestedByEmail: users.email,
                    sandboxId: deployments.sandboxId,
                    urls: deployments.urls,
                    type: deployments.type,
                    status: deployments.status,
                    message: deployments.message,
                    error: deployments.error,
                    progress: deployments.progress,
                    createdAt: deployments.createdAt,
                    updatedAt: deployments.updatedAt,
                })
                .from(deployments)
                .innerJoin(projects, eq(deployments.projectId, projects.id))
                .innerJoin(users, eq(deployments.requestedBy, users.id))
                .where(whereConditions)
                .orderBy(orderByClause)
                .limit(pageSize)
                .offset(offset);

            // Get total count
            const countResult = await ctx.db
                .select({ count: sql<number>`cast(count(*) as int)` })
                .from(deployments)
                .innerJoin(projects, eq(deployments.projectId, projects.id))
                .innerJoin(users, eq(deployments.requestedBy, users.id))
                .where(whereConditions);

            const count = countResult[0]?.count ?? 0;
            const totalPages = Math.ceil(count / pageSize);

            // Fetch domains for all projects in this page
            const projectIds = deploymentsData.map(d => d.projectId);

            let previewDomainsData: Array<{ projectId: string | null; fullDomain: string }> = [];
            let customDomainsData: Array<{ projectId: string; fullDomain: string }> = [];

            if (projectIds.length > 0) {
                // Fetch preview domains
                previewDomainsData = await ctx.db
                    .select({
                        projectId: previewDomains.projectId,
                        fullDomain: previewDomains.fullDomain,
                    })
                    .from(previewDomains)
                    .where(inArray(previewDomains.projectId, projectIds));

                // Fetch custom domains
                customDomainsData = await ctx.db
                    .select({
                        projectId: projectCustomDomains.projectId,
                        fullDomain: projectCustomDomains.fullDomain,
                    })
                    .from(projectCustomDomains)
                    .where(
                        and(
                            inArray(projectCustomDomains.projectId, projectIds),
                            eq(projectCustomDomains.status, ProjectCustomDomainStatus.ACTIVE)
                        )
                    );
            }

            // Create maps for quick lookup
            const previewDomainsByProject = new Map<string, string[]>();
            previewDomainsData.forEach(pd => {
                if (pd.projectId) {
                    if (!previewDomainsByProject.has(pd.projectId)) {
                        previewDomainsByProject.set(pd.projectId, []);
                    }
                    previewDomainsByProject.get(pd.projectId)!.push(`https://${pd.fullDomain}`);
                }
            });

            const customDomainsByProject = new Map<string, string[]>();
            customDomainsData.forEach(cd => {
                if (!customDomainsByProject.has(cd.projectId)) {
                    customDomainsByProject.set(cd.projectId, []);
                }
                customDomainsByProject.get(cd.projectId)!.push(`https://${cd.fullDomain}`);
            });

            return {
                deployments: deploymentsData.map(deployment => {
                    const urls: string[] = [];

                    // Add preview domains
                    const previewUrls = previewDomainsByProject.get(deployment.projectId) || [];
                    urls.push(...previewUrls);

                    // Add custom domains
                    const customUrls = customDomainsByProject.get(deployment.projectId) || [];
                    urls.push(...customUrls);

                    return {
                        ...deployment,
                        requestedByName: deployment.requestedByName ||
                            `${deployment.requestedByFirstName || ''} ${deployment.requestedByLastName || ''}`.trim() ||
                            deployment.requestedByEmail || '',
                        urls,
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
