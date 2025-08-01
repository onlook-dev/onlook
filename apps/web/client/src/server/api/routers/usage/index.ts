import { rateLimits, subscriptions, usageRecords } from '@onlook/db';
import { UsageType, type UsageResult } from '@onlook/models';
import { FREE_PRODUCT_CONFIG, SubscriptionStatus } from '@onlook/stripe';
import { sub } from 'date-fns/sub';
import { and, desc, eq, gt, gte, lt, lte, ne, sql, sum } from 'drizzle-orm';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const usageRouter = createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }): Promise<UsageResult> => {
        const user = ctx.user;
        return ctx.db.transaction(async (tx) => {
            // Calculate date ranges
            const now = new Date();
            // If the user has an active subscription then they can use their rate limits (including carry-over)
            const subscription = await tx.query.subscriptions.findFirst({
                where: and(eq(subscriptions.userId, user.id), eq(subscriptions.status, SubscriptionStatus.ACTIVE)),
            });

            // if no subscription then user is on a free plan
            if (!subscription) {
                return getFreePlanUsage(tx, user.id, now);
            }
            return getSubscriptionUsage(tx, user.id, now);
        });
    }),

    increment: protectedProcedure.input(z.object({
        type: z.nativeEnum(UsageType),
    })).mutation(async ({ ctx, input }) => {
        const user = ctx.user;
        // running a transaction helps with concurrency issues and ensures that
        // the usage is incremented atomically
        return ctx.db.transaction(async (tx) => {
            // users on free plans don't have their rate limits stored in the database
            // the limits are calculated on the fly instead
            const subscription = await tx.query.subscriptions.findFirst({
                where: and(eq(subscriptions.userId, user.id), eq(subscriptions.status, SubscriptionStatus.ACTIVE)),
            });

            let rateLimitId: string | undefined;
            if (subscription) {
                const now = new Date();
                const [limit] = await tx
                    .select({ id: rateLimits.id, left: rateLimits.left })
                    .from(rateLimits)
                    .where(and(
                        eq(rateLimits.userId, user.id),
                        lte(rateLimits.startedAt, now),
                        gte(rateLimits.endedAt, now),
                        ne(rateLimits.left, 0),
                    ))
                    // deduct from the credits that have carried over the most
                    // (in other words, the oldest credits)
                    .orderBy(desc(rateLimits.carryOverTotal))
                    .limit(1);

                // if there are no credits left then rollback
                if (!limit?.left) {
                    tx.rollback();
                    return;
                }

                await tx.update(rateLimits).set({
                    left: sql`${rateLimits.left} - 1`,
                }).where(and(
                    eq(rateLimits.id, limit.id),
                ));

                rateLimitId = limit.id;
            }

            const usageRecord = await tx.insert(usageRecords).values({
                userId: user.id,
                type: input.type,
                timestamp: new Date(),
            }).returning({ id: usageRecords.id });

            return { rateLimitId, usageRecordId: usageRecord?.[0]?.id };
        });
    }),

    revertIncrement: protectedProcedure.input(z.object({
        usageRecordId: z.string(),
        rateLimitId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        return ctx.db.transaction(async (tx) => {
            if (input.rateLimitId) {
                await tx.update(rateLimits).set({
                    left: sql`${rateLimits.left} + 1`,
                }).where(and(
                    eq(rateLimits.id, input.rateLimitId),
                ));
            }

            if (input.usageRecordId) {
                await tx.delete(usageRecords).where(and(eq(usageRecords.id, input.usageRecordId)));
            }

            return { rateLimitId: input.rateLimitId, usageRecordId: input.usageRecordId };
        });
    }),
});

export const getFreePlanUsage = async (
    tx: PgTransaction<any, any, any>,
    userId: string,
    now: Date,
): Promise<UsageResult> => {
    // Previous day
    const dayEnd = now;
    const dayStart = sub(now, { days: 1 });

    // Previous month  
    const monthEnd = now;
    const monthStart = sub(now, { months: 1 });

    // Count records from previous day
    const lastDayCount = await tx
        .select({ count: sql<number>`count(*)` })
        .from(usageRecords)
        .where(
            and(
                eq(usageRecords.userId, userId),
                gte(usageRecords.timestamp, dayStart),
                lt(usageRecords.timestamp, dayEnd),
            )
        );

    // Count records from previous month
    const lastMonthCount = await tx
        .select({ count: sql<number>`count(*)` })
        .from(usageRecords)
        .where(
            and(
                eq(usageRecords.userId, userId),
                gte(usageRecords.timestamp, monthStart),
                lt(usageRecords.timestamp, monthEnd),
            )
        );

    return {
        daily: {
            period: 'day',
            usageCount: lastDayCount[0]?.count || 0,
            limitCount: FREE_PRODUCT_CONFIG.dailyLimit,
        },
        monthly: {
            period: 'month',
            usageCount: lastMonthCount[0]?.count || 0,
            limitCount: FREE_PRODUCT_CONFIG.monthlyLimit,
        },
    };
}

const getSubscriptionUsage = async (
    tx: PgTransaction<any, any, any>,
    userId: string,
    now: Date,
): Promise<UsageResult> => {
    // Selects all valid rate limits for the user (i.e. not expired)
    // and sums the left and max values
    const limit = await tx
        .select({ left: sum(rateLimits.left), max: sum(rateLimits.max) })
        .from(rateLimits)
        .where(and(
            eq(rateLimits.userId, userId),
            lte(rateLimits.startedAt, now),
            gt(rateLimits.endedAt, now),
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
            usageCount: limit.max - limit.left,
            limitCount: limit.max,
        },
        monthly: {
            period: 'month',
            usageCount: limit.max - limit.left,
            limitCount: limit.max,
        },
    };
}