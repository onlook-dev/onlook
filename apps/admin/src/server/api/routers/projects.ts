import { projects } from '@onlook/db/src/schema';
import { desc, asc, sql } from 'drizzle-orm';
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

            // Get total count
            const countResult = await ctx.db
                .select({ count: sql<number>`cast(count(*) as int)` })
                .from(projects);

            const count = countResult[0]?.count ?? 0;

            const totalPages = Math.ceil(count / pageSize);

            return {
                projects: projectList,
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
