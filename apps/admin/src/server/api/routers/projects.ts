import { branches, projects, userProjects, users } from '@onlook/db/src/schema';
import { desc, asc, sql, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { adminProcedure, createTRPCRouter } from '../trpc';

export const projectsRouter = createTRPCRouter({
    list: adminProcedure
        .input(
            z.object({
                page: z.number().min(1).default(1),
                pageSize: z.number().min(1).max(100).default(20),
                sortBy: z.enum(['updated_at', 'created_at', 'name']).default('updated_at'),
                sortOrder: z.enum(['asc', 'desc']).default('desc'),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { page, pageSize, sortBy, sortOrder } = input;
            const offset = (page - 1) * pageSize;

            // Determine the order column
            const orderColumn = sortBy === 'name'
                ? projects.name
                : sortBy === 'created_at'
                ? projects.createdAt
                : projects.updatedAt;

            const orderFn = sortOrder === 'asc' ? asc : desc;

            // Fetch projects with pagination
            const projectList = await ctx.db
                .select({
                    id: projects.id,
                    name: projects.name,
                    previewImgUrl: projects.previewImgUrl,
                    createdAt: projects.createdAt,
                    updatedAt: projects.updatedAt,
                })
                .from(projects)
                .orderBy(orderFn(orderColumn))
                .limit(pageSize)
                .offset(offset);

            // Fetch branches with sandboxes for each project
            const projectIds = projectList.map(p => p.id);

            let branchesData: Array<{ projectId: string; sandboxId: string; name: string }> = [];
            let usersData: Array<{
                projectId: string;
                userId: string;
                email: string | null;
                firstName: string | null;
                lastName: string | null;
                displayName: string | null;
                role: string;
            }> = [];

            if (projectIds.length > 0) {
                branchesData = await ctx.db
                    .select({
                        projectId: branches.projectId,
                        sandboxId: branches.sandboxId,
                        name: branches.name,
                    })
                    .from(branches)
                    .where(inArray(branches.projectId, projectIds));

                // Fetch users with access for each project
                usersData = await ctx.db
                    .select({
                        projectId: userProjects.projectId,
                        userId: users.id,
                        email: users.email,
                        firstName: users.firstName,
                        lastName: users.lastName,
                        displayName: users.displayName,
                        role: userProjects.role,
                    })
                    .from(userProjects)
                    .innerJoin(users, eq(userProjects.userId, users.id))
                    .where(inArray(userProjects.projectId, projectIds));
            }

            // Map data to projects
            const projectsWithData = projectList.map(project => ({
                ...project,
                sandboxes: branchesData
                    .filter(b => b.projectId === project.id)
                    .map(b => ({
                        sandboxId: b.sandboxId,
                        branchName: b.name,
                    })),
                users: usersData
                    .filter(u => u.projectId === project.id)
                    .map(u => ({
                        id: u.userId,
                        email: u.email,
                        name: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
                        role: u.role,
                    })),
            }));

            // Get total count
            const countResult = await ctx.db
                .select({ count: sql<number>`cast(count(*) as int)` })
                .from(projects);

            const count = countResult[0]?.count ?? 0;

            const totalPages = Math.ceil(count / pageSize);

            return {
                projects: projectsWithData,
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
