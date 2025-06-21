import { subscriptions, toSubscription } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { and, eq } from 'drizzle-orm';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const subscriptionRouter = createTRPCRouter({
    get: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await db.query.subscriptions.findFirst({
            where: and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active')),
            with: {
                product: true,
                price: true,
            },
        });

        if (!subscription) {
            console.error('No active subscription found for user', user.id);
            return null;
        }
        return toSubscription(subscription);
    }),
});

