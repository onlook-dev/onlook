import { rateLimits, subscriptions, usageRecords } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { UsageType, type Usage } from '@onlook/models';
import { FREE_PRODUCT_CONFIG } from '@onlook/stripe';
import { and, eq, gte, lte, sql, sum } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { startOfDay } from 'date-fns/startOfDay';
import { startOfMonth } from 'date-fns/startOfMonth';
import { add } from 'date-fns/add';


export const usageRouter = createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;

        // Calculate date ranges
        const now = new Date();

        // If the user has an active subscription then they can use their rate limits (including carry-over)
        const subscription = await db.query.subscriptions.findFirst({
            where: and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active')),
        });

        // if no subscription then user is on a free plan
        if (!subscription) {
            const dayStart = startOfDay(now);
            const dayEnd = add(now, { days: 1});
            const monthStart = startOfMonth(now);
            const monthEnd = add(now, { days: 1});

            // Count records from current day
            const lastDayCount = await db
                .select({ count: sql<number>`count(*)` })
                .from(usageRecords)
                .where(
                    and(
                        eq(usageRecords.userId, user.id),
                        gte(usageRecords.timestamp, dayStart),
                        lte(usageRecords.timestamp, dayEnd),
                    )
                );

            // Count records from current month
            const lastMonthCount = await db
                .select({ count: sql<number>`count(*)` })
                .from(usageRecords)
                .where(
                    and(
                        eq(usageRecords.userId, user.id),
                        gte(usageRecords.timestamp, monthStart),
                        lte(usageRecords.timestamp, monthEnd),
                    )
                );
    
            return {
                daily: {
                    period: 'day',
                    usageCount: lastDayCount[0]?.count || 0,
                    limitCount: FREE_PRODUCT_CONFIG.dailyLimit,
                } satisfies Usage,
                monthly: {
                    period: 'month',
                    usageCount: lastMonthCount[0]?.count || 0,
                    limitCount: FREE_PRODUCT_CONFIG.monthlyLimit,
                } satisfies Usage,
            };
        }

        const left = await db
            .select({ left: sum(rateLimits.left), max: sum(rateLimits.max) })
            .from(rateLimits)
            .where(and(
                eq(rateLimits.userId, user.id),
                lte(rateLimits.startedAt, now),
                gte(rateLimits.endedAt, now),
            ))
            .then(res => ({
                left: res[0]?.left ? parseInt(res[0]?.left, 10) : 0,
                max: res[0]?.max ? parseInt(res[0]?.max, 10) : 0,
            }));

        return {
            daily: {
                period: 'day',
                // technically, this is the monthly value, since subscriptions don't have daily limits
                // the code returns the monthly limits, which is technically correct.
                usageCount: left.max - left.left,
                limitCount: left.max,
            } satisfies Usage,
            monthly: {
                period: 'month',
                usageCount: left.max - left.left,
                limitCount: left.max,
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
