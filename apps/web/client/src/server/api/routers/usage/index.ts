import { subscriptions, usageRecords } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { UsageType, type Usage } from '@onlook/models';
import { FREE_PRODUCT_CONFIG, SubscriptionStatus } from '@onlook/stripe';
import { and, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const usageRouter = createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;

        const subscription = await db.query.subscriptions.findFirst({
            where: and(
                eq(subscriptions.userId, user.id),
                eq(subscriptions.status, SubscriptionStatus.ACTIVE),
            ),
            with: {
                price: true,
            },
        });

        // Calculate date ranges
        const now = new Date();
        const lastDay = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
        const lastMonth = subscription ?
            subscription.startedAt : // If subscription exists, use the start date
            new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago


        // Count records from last day
        const lastDayCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(usageRecords)
            .where(
                and(
                    eq(usageRecords.userId, user.id),
                    gte(usageRecords.timestamp, lastDay)
                )
            );

        // Count records from last month
        const lastMonthCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(usageRecords)
            .where(
                and(
                    eq(usageRecords.userId, user.id),
                    gte(usageRecords.timestamp, lastMonth)
                )
            );

        let dailyLimitCount = FREE_PRODUCT_CONFIG.dailyLimit;
        let monthlyLimitCount = FREE_PRODUCT_CONFIG.monthlyLimit;

        if (subscription) {
            // Monthly and daily limits are the same for PRO subscription
            dailyLimitCount = subscription.price.monthlyMessageLimit;
            monthlyLimitCount = subscription.price.monthlyMessageLimit;
        }

        return {
            daily: {
                period: 'day',
                usageCount: lastDayCount[0]?.count || 0,
                limitCount: dailyLimitCount,
            } satisfies Usage,
            monthly: {
                period: 'month',
                usageCount: lastMonthCount[0]?.count || 0,
                limitCount: monthlyLimitCount,
            } satisfies Usage,
        };
    }),

    increment: protectedProcedure.input(z.object({
        type: z.nativeEnum(UsageType),
    })).mutation(async ({ ctx, input }) => {
        const user = ctx.user;
        await db.insert(usageRecords).values({
            userId: user.id,
            type: input.type,
            timestamp: new Date(),
        });
    }),
});
