import { branches, projects, userProjects, users } from '@onlook/db/src/schema';
import { ProjectRole } from '@onlook/models';
import { desc, asc, sql, eq, inArray, or, ilike } from 'drizzle-orm';
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
                search: z.string().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { page, pageSize, sortBy, sortOrder, search } = input;
            const offset = (page - 1) * pageSize;

            // Determine the order column
            const orderColumn = sortBy === 'name'
                ? projects.name
                : sortBy === 'created_at'
                ? projects.createdAt
                : projects.updatedAt;

            const orderFn = sortOrder === 'asc' ? asc : desc;

            // Build where conditions for search
            let whereConditions;
            if (search) {
                // First get user IDs that match the search
                const matchingUsers = await ctx.db
                    .select({ id: users.id })
                    .from(users)
                    .where(
                        or(
                            ilike(users.email, `%${search}%`),
                            ilike(users.displayName, `%${search}%`),
                            ilike(users.firstName, `%${search}%`),
                            ilike(users.lastName, `%${search}%`)
                        )
                    );

                const matchingUserIds = matchingUsers.map(u => u.id);

                // Get project IDs that have these users
                let projectIdsFromUsers: string[] = [];
                if (matchingUserIds.length > 0) {
                    const userProjectMatches = await ctx.db
                        .select({ projectId: userProjects.projectId })
                        .from(userProjects)
                        .where(inArray(userProjects.userId, matchingUserIds));
                    projectIdsFromUsers = userProjectMatches.map(up => up.projectId);
                }

                // Combine search conditions
                if (projectIdsFromUsers.length > 0) {
                    whereConditions = or(
                        ilike(projects.name, `%${search}%`),
                        sql`${projects.id}::text ilike ${`%${search}%`}`,
                        inArray(projects.id, projectIdsFromUsers)
                    );
                } else {
                    whereConditions = or(
                        ilike(projects.name, `%${search}%`),
                        sql`${projects.id}::text ilike ${`%${search}%`}`
                    );
                }
            }

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
                .$dynamic()
                .where(whereConditions ?? sql`true`)
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
                .from(projects)
                .$dynamic()
                .where(whereConditions ?? sql`true`);

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
    getById: adminProcedure
        .input(z.string())
        .query(async ({ ctx, input: projectId }) => {
            // Fetch project
            const project = await ctx.db
                .select({
                    id: projects.id,
                    name: projects.name,
                    previewImgUrl: projects.previewImgUrl,
                    createdAt: projects.createdAt,
                    updatedAt: projects.updatedAt,
                })
                .from(projects)
                .where(eq(projects.id, projectId))
                .limit(1);

            if (project.length === 0) {
                throw new Error('Project not found');
            }

            const projectData = project[0];

            // Fetch branches with sandboxes
            const branchesData = await ctx.db
                .select({
                    sandboxId: branches.sandboxId,
                    name: branches.name,
                })
                .from(branches)
                .where(eq(branches.projectId, projectId));

            // Fetch users with access
            const usersData = await ctx.db
                .select({
                    userId: users.id,
                    email: users.email,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    displayName: users.displayName,
                    avatarUrl: users.avatarUrl,
                    role: userProjects.role,
                })
                .from(userProjects)
                .innerJoin(users, eq(userProjects.userId, users.id))
                .where(eq(userProjects.projectId, projectId));

            return {
                ...projectData,
                sandboxes: branchesData.map(b => ({
                    sandboxId: b.sandboxId,
                    branchName: b.name,
                })),
                users: usersData.map(u => ({
                    id: u.userId,
                    email: u.email,
                    name: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
                    avatarUrl: u.avatarUrl,
                    role: u.role,
                })),
            };
        }),
    addUser: adminProcedure
        .input(
            z.object({
                projectId: z.string(),
                userId: z.string(),
                role: z.enum(['owner', 'admin']).default('admin'),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Check if user is already in project
            const existing = await ctx.db
                .select()
                .from(userProjects)
                .where(
                    sql`${userProjects.projectId} = ${input.projectId} AND ${userProjects.userId} = ${input.userId}`
                );

            if (existing.length > 0) {
                throw new Error('User is already added to this project');
            }

            // Add user to project
            await ctx.db.insert(userProjects).values({
                projectId: input.projectId,
                userId: input.userId,
                role: input.role === 'owner' ? ProjectRole.OWNER : ProjectRole.ADMIN,
            });

            return { success: true };
        }),
    removeUser: adminProcedure
        .input(
            z.object({
                projectId: z.string(),
                userId: z.string(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            await ctx.db
                .delete(userProjects)
                .where(
                    sql`${userProjects.projectId} = ${input.projectId} AND ${userProjects.userId} = ${input.userId}`
                );

            return { success: true };
        }),
});
