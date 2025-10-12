import { products, prices, subscriptions, users } from '@onlook/db/src/schema';
import { SubscriptionStatus } from '@onlook/stripe';
import { desc, sql, eq } from 'drizzle-orm';
import { z } from 'zod';
import { adminProcedure, createTRPCRouter } from '../trpc';

export const subscriptionsRouter = createTRPCRouter({
    listProducts: adminProcedure
        .query(async ({ ctx }) => {
            // Fetch all products with their prices
            const productsData = await ctx.db
                .select({
                    id: products.id,
                    name: products.name,
                    stripeProductId: products.stripeProductId,
                })
                .from(products);

            // Fetch all prices
            const pricesData = await ctx.db
                .select({
                    id: prices.id,
                    productId: prices.productId,
                    key: prices.key,
                    monthlyMessageLimit: prices.monthlyMessageLimit,
                    stripePriceId: prices.stripePriceId,
                })
                .from(prices);

            // Get subscriber count for each price
            const subscriberCounts = await ctx.db
                .select({
                    priceId: subscriptions.priceId,
                    count: sql<number>`cast(count(*) as int)`,
                })
                .from(subscriptions)
                .where(eq(subscriptions.status, SubscriptionStatus.ACTIVE))
                .groupBy(subscriptions.priceId);

            // Create a map for quick lookup
            const countMap = new Map(
                subscriberCounts.map(sc => [sc.priceId, sc.count])
            );

            // Map prices to products with subscriber counts
            const productsWithPrices = productsData.map(product => ({
                ...product,
                prices: pricesData
                    .filter(price => price.productId === product.id)
                    .map(price => ({
                        ...price,
                        subscriberCount: countMap.get(price.id) ?? 0,
                    })),
            }));

            return productsWithPrices;
        }),
    listSubscriptions: adminProcedure
        .input(
            z.object({
                page: z.number().min(1).default(1),
                pageSize: z.number().min(1).max(100).default(20),
            }),
        )
        .query(async ({ ctx, input }) => {
            const { page, pageSize } = input;
            const offset = (page - 1) * pageSize;

            // Fetch subscriptions with user, product, and price info
            const subscriptionsData = await ctx.db
                .select({
                    id: subscriptions.id,
                    userId: subscriptions.userId,
                    userName: users.displayName,
                    userFirstName: users.firstName,
                    userLastName: users.lastName,
                    userEmail: users.email,
                    productName: products.name,
                    priceKey: prices.key,
                    monthlyMessageLimit: prices.monthlyMessageLimit,
                    status: subscriptions.status,
                    startedAt: subscriptions.startedAt,
                    endedAt: subscriptions.endedAt,
                    stripeSubscriptionId: subscriptions.stripeSubscriptionId,
                    stripeCurrentPeriodStart: subscriptions.stripeCurrentPeriodStart,
                    stripeCurrentPeriodEnd: subscriptions.stripeCurrentPeriodEnd,
                })
                .from(subscriptions)
                .innerJoin(users, eq(subscriptions.userId, users.id))
                .innerJoin(products, eq(subscriptions.productId, products.id))
                .innerJoin(prices, eq(subscriptions.priceId, prices.id))
                .orderBy(desc(subscriptions.startedAt))
                .limit(pageSize)
                .offset(offset);

            // Get total count
            const countResult = await ctx.db
                .select({ count: sql<number>`cast(count(*) as int)` })
                .from(subscriptions);

            const count = countResult[0]?.count ?? 0;
            const totalPages = Math.ceil(count / pageSize);

            return {
                subscriptions: subscriptionsData.map(sub => ({
                    ...sub,
                    userName: sub.userName || `${sub.userFirstName || ''} ${sub.userLastName || ''}`.trim() || sub.userEmail || '',
                })),
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
