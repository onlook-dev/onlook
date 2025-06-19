import { subscriptions, toSubscription, usageRecords } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import type { Usage } from '@onlook/models';
import { and, eq, gte, sql } from 'drizzle-orm';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const subscriptionRouter = createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await db.query.subscriptions.findFirst({
            where: and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active')),
            with: {
                plan: true
            },
        });

        if (!subscription) {
            console.error('No active subscription found for user', user.id);
            return null;
        }
        return toSubscription(subscription);
    }),

    getUsage: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await db.query.subscriptions.findFirst({
            where: and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active')),
            with: {
                plan: true,
            },
        });

        if (!subscription) {
            console.error('No subscription found');
            return null;
        }

        // Calculate date ranges
        const now = new Date();
        const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
        const lastMonth = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

        // Count records from last day
        const lastDayCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(usageRecords)
            .where(
                and(
                    eq(usageRecords.subscriptionId, subscription.id),
                    gte(usageRecords.timestamp, lastDay)
                )
            );

        // Count records from last month
        const lastMonthCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(usageRecords)
            .where(
                and(
                    eq(usageRecords.subscriptionId, subscription.id),
                    gte(usageRecords.timestamp, lastMonth)
                )
            );

        return {
            daily: {
                period: 'day',
                usageCount: lastDayCount[0]?.count || 0,
                limitCount: subscription.plan.dailyMessages,
            } satisfies Usage,
            monthly: {
                period: 'month',
                usageCount: lastMonthCount[0]?.count || 0,
                limitCount: subscription.plan.monthlyMessages,
            } satisfies Usage,
        };
    }),
});
