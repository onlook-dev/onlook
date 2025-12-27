/**
 * Credit Service - Manages Cynthia Build My Site credit balances
 * Phase 4.1: Uses SECURITY DEFINER functions for RLS-safe operations
 */

import { db } from '@onlook/db/src/client';
import { creditBalances, CYNTHIA_PLAN_CREDITS } from '@onlook/db/src/schema';
import { eq, sql } from 'drizzle-orm';

export type CynthiaPlan = 'free' | 'starter' | 'pro' | 'agency';

export interface CreditCheckResult {
    hasCredits: boolean;
    used: number;
    total: number;
    remaining: number;
    plan: CynthiaPlan;
}

/**
 * Get or create credit balance for a user
 * Phase 4.1: Calls SECURITY DEFINER function to bypass RLS safely
 */
export async function getOrCreateCreditBalance(userId: string) {
    // Call SECURITY DEFINER function that enforces ownership internally
    const result = await db.execute(
        sql`SELECT * FROM ensure_credit_balance(${userId}::uuid)`
    );

    const balance = result.rows[0];
    if (!balance) {
        throw new Error('Failed to ensure credit balance');
    }

    return {
        id: balance.id,
        userId: balance.user_id,
        plan: balance.plan,
        monthlyCredits: balance.monthly_credits,
        usedCredits: balance.used_credits,
        resetAt: balance.reset_at,
        createdAt: balance.created_at,
        updatedAt: balance.updated_at,
    };
}

/**
 * Check if user has available credits
 */
export async function checkCredits(userId: string): Promise<CreditCheckResult> {
    const balance = await getOrCreateCreditBalance(userId);

    const remaining = balance.monthlyCredits - balance.usedCredits;
    const hasCredits = remaining > 0;

    return {
        hasCredits,
        used: balance.usedCredits,
        total: balance.monthlyCredits,
        remaining,
        plan: balance.plan as CynthiaPlan,
    };
}

/**
 * Consume credits (decrement available balance)
 * Phase 4.1: Uses SECURITY DEFINER function for atomic operation
 * Returns true if successful, false if insufficient credits
 */
export async function consumeCredits(
    userId: string,
    amount: number = 1
): Promise<boolean> {
    // Call SECURITY DEFINER function with ownership validation
    const result = await db.execute(
        sql`SELECT * FROM consume_credit(${userId}::uuid, ${amount}::int)`
    );

    const outcome = result.rows[0];
    if (!outcome) {
        throw new Error('consume_credit function did not return a result');
    }

    return outcome.success === true;
}

/**
 * Update user's plan and reset credits
 * Phase 4.1: Uses SECURITY DEFINER function
 * Called when subscription changes
 */
export async function updatePlan(userId: string, newPlan: CynthiaPlan): Promise<void> {
    // Call SECURITY DEFINER function
    const result = await db.execute(
        sql`SELECT * FROM update_user_plan(${userId}::uuid, ${newPlan}::cynthia_plan)`
    );

    const outcome = result.rows[0];
    if (!outcome || outcome.success !== true) {
        throw new Error(outcome?.message || 'Failed to update plan');
    }
}

/**
 * Reset monthly credits for a user
 * Called by monthly cron job or manually
 * Note: This uses direct UPDATE, should only be called by admin/system
 */
export async function resetMonthlyCredits(userId: string): Promise<void> {
    const balance = await getOrCreateCreditBalance(userId);

    // Calculate next reset date (1 month from now)
    const nextReset = new Date(balance.resetAt);
    nextReset.setMonth(nextReset.getMonth() + 1);

    // Direct update - should only be called by system/admin context
    await db
        .update(creditBalances)
        .set({
            usedCredits: 0,
            resetAt: nextReset,
            updatedAt: new Date(),
        })
        .where(eq(creditBalances.userId, userId));
}

/**
 * Get plan pricing information
 */
export const CYNTHIA_PLAN_INFO = {
    free: {
        name: 'Free',
        price: 0,
        credits: CYNTHIA_PLAN_CREDITS.free,
        unlocks: 0,
        fixPacks: 0,
    },
    starter: {
        name: 'Starter',
        price: 2900, // $29 in cents
        credits: CYNTHIA_PLAN_CREDITS.starter,
        unlocks: 5,
        fixPacks: 5,
    },
    pro: {
        name: 'Pro',
        price: 9900, // $99 in cents
        credits: CYNTHIA_PLAN_CREDITS.pro,
        unlocks: 25,
        fixPacks: 25,
    },
    agency: {
        name: 'Agency',
        price: 29900, // $299 in cents
        credits: CYNTHIA_PLAN_CREDITS.agency,
        unlocks: 100,
        fixPacks: 100,
    },
};
