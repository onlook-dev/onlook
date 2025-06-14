import { subscriptions } from '@onlook/db';
import { db } from '@onlook/db/src/client';
import { and, eq } from 'drizzle-orm';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const subscriptionRouter = createTRPCRouter({
    userPlan: protectedProcedure.query(async ({ ctx }) => {
        const user = ctx.user;
        const subscription = await db.query.subscriptions.findFirst({
            where: and(eq(subscriptions.userId, user.id), eq(subscriptions.status, 'active')),
            with: {
                plan: true
            },
        });
        return subscription;
    }),
});