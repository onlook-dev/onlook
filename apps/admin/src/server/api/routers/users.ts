import { prices, products, projects, rateLimits, subscriptions, userProjects, users } from '@onlook/db/src/schema';
import { SubscriptionStatus } from '@onlook/stripe';
import { asc, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
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
                    sql`${users.id}::text ilike ${`%${search}%`}`
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
    search: adminProcedure
        .input(
            z.object({
                query: z.string().min(1),
                limit: z.number().min(1).max(20).default(10),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { query, limit } = input;

            const whereConditions = or(
                ilike(users.email, `%${query}%`),
                ilike(users.displayName, `%${query}%`),
                ilike(users.firstName, `%${query}%`),
                ilike(users.lastName, `%${query}%`),
                sql`${users.id}::text ilike ${`%${query}%`}`
            );

            const userList = await ctx.db
                .select({
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    displayName: users.displayName,
                    email: users.email,
                    avatarUrl: users.avatarUrl,
                })
                .from(users)
                .$dynamic()
                .where(whereConditions)
                .limit(limit);

            return userList.map(u => ({
                ...u,
                name: u.displayName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
            }));
        }),
    getById: adminProcedure
        .input(z.string())
        .query(async ({ ctx, input: userId }) => {
            // Fetch user
            const user = await ctx.db
                .select({
                    id: users.id,
                    firstName: users.firstName,
                    lastName: users.lastName,
                    displayName: users.displayName,
                    email: users.email,
                    avatarUrl: users.avatarUrl,
                    createdAt: users.createdAt,
                    updatedAt: users.updatedAt,
                    stripeCustomerId: users.stripeCustomerId,
                    githubInstallationId: users.githubInstallationId,
                })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            if (user.length === 0 || !user[0]) {
                throw new Error('User not found');
            }

            const userData = user[0];

            // Fetch projects user has access to
            const projectsData = await ctx.db
                .select({
                    projectId: projects.id,
                    projectName: projects.name,
                    role: userProjects.role,
                    previewImgUrl: projects.previewImgUrl,
                })
                .from(userProjects)
                .innerJoin(projects, eq(userProjects.projectId, projects.id))
                .where(eq(userProjects.userId, userId));

            // Fetch subscriptions
            const subscriptionsData = await ctx.db
                .select({
                    id: subscriptions.id,
                    status: subscriptions.status,
                    startedAt: subscriptions.startedAt,
                    endedAt: subscriptions.endedAt,
                    stripeSubscriptionId: subscriptions.stripeSubscriptionId,
                    stripeCurrentPeriodStart: subscriptions.stripeCurrentPeriodStart,
                    stripeCurrentPeriodEnd: subscriptions.stripeCurrentPeriodEnd,
                    productName: products.name,
                    priceKey: prices.key,
                    monthlyMessageLimit: prices.monthlyMessageLimit,
                })
                .from(subscriptions)
                .innerJoin(products, eq(subscriptions.productId, products.id))
                .innerJoin(prices, eq(subscriptions.priceId, prices.id))
                .where(eq(subscriptions.userId, userId));

            // Fetch rate limits
            const rateLimitsData = await ctx.db
                .select({
                    id: rateLimits.id,
                    max: rateLimits.max,
                    left: rateLimits.left,
                    startedAt: rateLimits.startedAt,
                    endedAt: rateLimits.endedAt,
                    carryOverTotal: rateLimits.carryOverTotal,
                    updatedAt: rateLimits.updatedAt,
                })
                .from(rateLimits)
                .where(eq(rateLimits.userId, userId))
                .orderBy(desc(rateLimits.startedAt));

            return {
                ...userData,
                name: userData.displayName || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.email || '',
                projects: projectsData.map(p => ({
                    id: p.projectId,
                    name: p.projectName,
                    role: p.role,
                    previewImgUrl: p.previewImgUrl,
                })),
                subscriptions: subscriptionsData,
                rateLimits: rateLimitsData,
            };
        }),
    updateRateLimit: adminProcedure
        .input(
            z.object({
                rateLimitId: z.string(),
                creditsToAdd: z.number().min(1).max(10000),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Fetch the current rate limit
            const rateLimitData = await ctx.db
                .select()
                .from(rateLimits)
                .where(eq(rateLimits.id, input.rateLimitId))
                .limit(1);

            if (rateLimitData.length === 0 || !rateLimitData[0]) {
                throw new Error('Rate limit not found');
            }

            const currentRateLimit = rateLimitData[0];
            const newLeft = Math.min(currentRateLimit.left + input.creditsToAdd, currentRateLimit.max);

            // Update the rate limit
            await ctx.db
                .update(rateLimits)
                .set({
                    left: newLeft,
                    updatedAt: new Date(),
                })
                .where(eq(rateLimits.id, input.rateLimitId));

            return {
                success: true,
                newLeft,
                creditsAdded: newLeft - currentRateLimit.left,
            };
        }),
    addSubscription: adminProcedure
        .input(
            z.object({
                userId: z.string().uuid(),
                productId: z.string().uuid(),
                priceId: z.string().uuid(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Fetch user
            const user = await ctx.db
                .select()
                .from(users)
                .where(eq(users.id, input.userId))
                .limit(1);

            if (user.length === 0 || !user[0]) {
                throw new Error('User not found');
            }

            // Fetch price to get monthly message limit
            const price = await ctx.db
                .select()
                .from(prices)
                .where(eq(prices.id, input.priceId))
                .limit(1);

            if (price.length === 0 || !price[0]) {
                throw new Error('Price not found');
            }

            // Create subscription with admin/mock Stripe data
            const now = new Date();
            const periodEnd = new Date(now);
            periodEnd.setMonth(periodEnd.getMonth() + 1);

            // Use existing Stripe customer ID or generate a stub one
            const stripeCustomerId = user[0].stripeCustomerId || `stub_stripe_customer_id_${Date.now()}`;
            const stripeSubscriptionItemId = `si_admin_${Date.now()}`;

            const newSubscription = await ctx.db
                .insert(subscriptions)
                .values({
                    userId: input.userId,
                    productId: input.productId,
                    priceId: input.priceId,
                    stripeCustomerId,
                    stripeSubscriptionId: `sub_admin_${Date.now()}`,
                    stripeSubscriptionItemId,
                    status: SubscriptionStatus.ACTIVE,
                    stripeCurrentPeriodStart: now,
                    stripeCurrentPeriodEnd: periodEnd,
                })
                .returning();

            if (!newSubscription[0]) {
                throw new Error('Failed to create subscription');
            }

            // Create rate limit for the subscription
            const carryOverKey = crypto.randomUUID();
            await ctx.db
                .insert(rateLimits)
                .values({
                    userId: input.userId,
                    subscriptionId: newSubscription[0].id,
                    startedAt: now,
                    endedAt: periodEnd,
                    max: price[0].monthlyMessageLimit,
                    left: price[0].monthlyMessageLimit,
                    carryOverKey,
                    carryOverTotal: 0,
                    stripeSubscriptionItemId,
                });

            return {
                success: true,
                subscription: newSubscription[0],
            };
        }),
    removeSubscription: adminProcedure
        .input(
            z.object({
                subscriptionId: z.string().uuid(),
                userId: z.string().uuid(),
            }),
        )
        .mutation(async ({ ctx, input }) => {
            // Verify the subscription exists and belongs to the user
            const subscription = await ctx.db
                .select()
                .from(subscriptions)
                .where(eq(subscriptions.id, input.subscriptionId))
                .limit(1);

            if (subscription.length === 0 || !subscription[0]) {
                throw new Error('Subscription not found');
            }

            if (subscription[0].userId !== input.userId) {
                throw new Error('Subscription does not belong to this user');
            }

            // Delete the subscription
            await ctx.db
                .delete(subscriptions)
                .where(eq(subscriptions.id, input.subscriptionId));

            return {
                success: true,
            };
        }),
});
