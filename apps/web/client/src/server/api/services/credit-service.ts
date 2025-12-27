/**
 * Credit Service - Manages Cynthia Build My Site credit balances
 * Phase 4: Monetization & entitlement
 */

import { db } from '@onlook/db/src/client';
import { creditBalances, CYNTHIA_PLAN_CREDITS } from '@onlook/db/src/schema';
import { eq } from 'drizzle-orm';

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
 * If balance doesn't exist, creates one with free plan
 */
export async function getOrCreateCreditBalance(userId: string) {
    // Try to get existing balance
    const [existing] = await db
        .select()
        .from(creditBalances)
        .where(eq(creditBalances.userId, userId))
        .limit(1);

    if (existing) {
        return existing;
    }

    // Create new balance (free plan by default)
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);

    const [newBalance] = await db
        .insert(creditBalances)
        .values({
            userId,
            plan: 'free',
            monthlyCredits: CYNTHIA_PLAN_CREDITS.free,
            usedCredits: 0,
            resetAt: nextReset,
        })
        .returning();

    if (!newBalance) {
        throw new Error('Failed to create credit balance');
    }

    return newBalance;
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
 * Returns true if successful, false if insufficient credits
 */
export async function consumeCredits(
    userId: string,
    amount: number = 1
): Promise<boolean> {
    const balance = await getOrCreateCreditBalance(userId);

    // Check if enough credits available
    const remaining = balance.monthlyCredits - balance.usedCredits;
    if (remaining < amount) {
        return false; // Insufficient credits
    }

    // Decrement credits
    await db
        .update(creditBalances)
        .set({
            usedCredits: balance.usedCredits + amount,
            updatedAt: new Date(),
        })
        .where(eq(creditBalances.userId, userId));

    return true;
}

/**
 * Update user's plan and reset credits
 * Called when subscription changes
 */
export async function updatePlan(userId: string, newPlan: CynthiaPlan): Promise<void> {
    const balance = await getOrCreateCreditBalance(userId);
    const newCreditAmount = CYNTHIA_PLAN_CREDITS[newPlan];

    // Calculate next reset date (1 month from now)
    const nextReset = new Date();
    nextReset.setMonth(nextReset.getMonth() + 1);

    await db
        .update(creditBalances)
        .set({
            plan: newPlan,
            monthlyCredits: newCreditAmount,
            usedCredits: 0, // Reset used credits on plan change
            resetAt: nextReset,
            updatedAt: new Date(),
        })
        .where(eq(creditBalances.userId, userId));
}

/**
 * Reset monthly credits for a user
 * Called by monthly cron job or manually
 */
export async function resetMonthlyCredits(userId: string): Promise<void> {
    const balance = await getOrCreateCreditBalance(userId);

    // Calculate next reset date (1 month from now)
    const nextReset = new Date(balance.resetAt);
    nextReset.setMonth(nextReset.getMonth() + 1);

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
