import { users, userProjects, projects } from '@onlook/db/src/schema';
import { desc, asc, sql, eq, inArray, or, ilike } from 'drizzle-orm';
import { z } from 'zod';
import { adminProcedure, createTRPCRouter } from '../trpc';

export const usersRouter = createTRPCRouter({
    list: adminProcedure
        .input(
            z.object({
                page: z.number().min(1).default(1),
                pageSize: z.number().min(1).max(100).default(20),
                sortBy: z.enum(['updated_at', 'created_at', 'email', 'name']).default('updated_at'),
                sortOrder: z.enum(['asc', 'desc']).default('desc'),
                search: z.string().optional(),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { page, pageSize, sortBy, sortOrder, search } = input;
            const offset = (page - 1) * pageSize;

            // Determine the order column
            const orderColumn = sortBy === 'email'
                ? users.email
                : sortBy === 'name'
                ? users.displayName
                : sortBy === 'created_at'
                ? users.createdAt
                : users.updatedAt;

            const orderFn = sortOrder === 'asc' ? asc : desc;

            // Build where conditions for search
            let whereConditions;
            if (search) {
                whereConditions = or(
                    ilike(users.email, `%${search}%`),
                    ilike(users.displayName, `%${search}%`),
                    ilike(users.firstName, `%${search}%`),
                    ilike(users.lastName, `%${search}%`),
                    ilike(users.id, `%${search}%`)
                );
            }

            // Fetch users with pagination
            const userList = await ctx.db
                .select({
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    displayName: users.displayName,
                    email: users.email,
                    avatarUrl: users.avatarUrl,
                    createdAt: users.createdAt,
                    updatedAt: users.updatedAt,
                })
                .from(users)
                .$dynamic()
                .where(whereConditions ?? sql`true`)
                .orderBy(orderFn(orderColumn))
                .limit(pageSize)
                .offset(offset);

            // Fetch projects for each user
            const userIds = userList.map(u => u.id);

            let projectsData: Array<{
                userId: string;
                projectId: string;
                projectName: string;
                role: string;
            }> = [];

            if (userIds.length > 0) {
                projectsData = await ctx.db
                    .select({
                        userId: userProjects.userId,
                        projectId: userProjects.projectId,
                        projectName: projects.name,
                        role: userProjects.role,
                    })
                    .from(userProjects)
                    .innerJoin(projects, eq(userProjects.projectId, projects.id))
                    .where(inArray(userProjects.userId, userIds));
            }

            // Map data to users
            const usersWithData = userList.map(user => ({
                ...user,
                name: user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
                projects: projectsData
                    .filter(p => p.userId === user.id)
                    .map(p => ({
                        id: p.projectId,
                        name: p.projectName,
                        role: p.role,
                    })),
            }));

            // Get total count
            const countResult = await ctx.db
                .select({ count: sql<number>`cast(count(*) as int)` })
                .from(users)
                .$dynamic()
                .where(whereConditions ?? sql`true`);

            const count = countResult[0]?.count ?? 0;

            const totalPages = Math.ceil(count / pageSize);

            return {
                users: usersWithData,
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
