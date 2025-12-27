/**
 * Credits Router - Manages credit balance queries
 * Phase 4: Monetization
 */

import { createTRPCRouter, protectedProcedure } from '../../trpc';
import { checkCredits } from '../../services/credit-service';

export const creditsRouter = createTRPCRouter({
    /**
     * Get current user's credit balance
     */
    getBalance: protectedProcedure.query(async ({ ctx }) => {
        const userId = ctx.user.id;
        const balance = await checkCredits(userId);

        return {
            plan: balance.plan,
            total: balance.total,
            used: balance.used,
            remaining: balance.remaining,
            hasCredits: balance.hasCredits,
        };
    }),
});
