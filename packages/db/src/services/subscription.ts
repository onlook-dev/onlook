import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from '../client';
import { plans, prices, subscriptions, users } from '../schema';
import type { Plan, Subscription } from '../schema';

export const subscriptionService = {
    // Create a new subscription
    async createSubscription({
        userId,
        planId,
        priceId,
        stripeSubscriptionId,
        status = 'active',
    }: {
        userId: string;
        planId: string;
        priceId: string;
        stripeSubscriptionId: string;
        status?: string;
    }) {
        const [subscription] = await db
            .insert(subscriptions)
            .values({
                userId,
                planId,
                priceId,
                stripeSubscriptionId,
                status,
                startDate: new Date(),
            })
            .returning();
        
        return subscription;
    },

    // Update subscription status
    async updateSubscriptionStatus(stripeSubscriptionId: string, status: string, endDate?: Date) {
        const [updated] = await db
            .update(subscriptions)
            .set({ 
                status,
                ...(endDate && { endDate })
            })
            .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
            .returning();
        
        return updated;
    },

    // Update subscription plan/price
    async updateSubscriptionPlan({
        subscriptionId,
        planId,
        priceId,
    }: {
        subscriptionId: string;
        planId: string;
        priceId: string;
    }) {
        const [updated] = await db
            .update(subscriptions)
            .set({ planId, priceId })
            .where(eq(subscriptions.id, subscriptionId))
            .returning();
        
        return updated;
    },

    // Get active subscription for user
    async getActiveSubscription(userId: string) {
        const subscription = await db.query.subscriptions.findFirst({
            where: and(
                eq(subscriptions.userId, userId),
                eq(subscriptions.status, 'active'),
                isNull(subscriptions.endDate)
            ),
            with: {
                plan: true,
                price: true,
            },
            orderBy: [desc(subscriptions.startDate)],
        });
        
        return subscription;
    },

    // Get subscription by Stripe ID
    async getSubscriptionByStripeId(stripeSubscriptionId: string) {
        const subscription = await db.query.subscriptions.findFirst({
            where: eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId),
            with: {
                plan: true,
                price: true,
            },
        });
        
        return subscription;
    },

    // Get all subscriptions for a user
    async getUserSubscriptions(userId: string) {
        const userSubscriptions = await db.query.subscriptions.findMany({
            where: eq(subscriptions.userId, userId),
            with: {
                plan: true,
                price: true,
            },
            orderBy: [desc(subscriptions.startDate)],
        });
        
        return userSubscriptions;
    },

    // Cancel subscription (set to cancel at period end)
    async cancelSubscription(subscriptionId: string, cancelAtDate: Date) {
        const [updated] = await db
            .update(subscriptions)
            .set({ 
                status: 'canceled',
                endDate: cancelAtDate,
            })
            .where(eq(subscriptions.id, subscriptionId))
            .returning();
        
        return updated;
    },

    // Get user by customer ID
    async getUserByCustomerId(stripeCustomerId: string) {
        const user = await db.query.users.findFirst({
            where: eq(users.stripeCustomerId, stripeCustomerId),
        });
        
        return user;
    },

    // Update user's Stripe customer ID
    async updateUserStripeCustomerId(userId: string, stripeCustomerId: string) {
        const [updated] = await db
            .update(users)
            .set({ stripeCustomerId })
            .where(eq(users.id, userId))
            .returning();
        
        return updated;
    },

    // Get plan by Stripe product ID
    async getPlanByStripeProductId(stripeProductId: string) {
        const plan = await db.query.plans.findFirst({
            where: eq(plans.stripeProductId, stripeProductId),
        });
        
        return plan;
    },

    // Get price by Stripe price ID
    async getPriceByStripePriceId(stripePriceId: string) {
        const price = await db.query.prices.findFirst({
            where: eq(prices.stripePriceId, stripePriceId),
            with: {
                plan: true,
            },
        });
        
        return price;
    },

    // Get all available plans with prices
    async getAvailablePlans() {
        const availablePlans = await db.query.plans.findMany({
            with: {
                prices: {
                    orderBy: [desc(prices.pricePerMonth)],
                },
            },
        });
        
        return availablePlans;
    },

    // Create or update plan
    async upsertPlan({
        stripeProductId,
        name,
        type,
        dailyMessages,
        monthlyMessages,
    }: {
        stripeProductId: string;
        name: string;
        type: 'free' | 'pro';
        dailyMessages: number;
        monthlyMessages: number;
    }) {
        const existingPlan = await this.getPlanByStripeProductId(stripeProductId);
        
        if (existingPlan) {
            const [updated] = await db
                .update(plans)
                .set({ name, type, dailyMessages, monthlyMessages })
                .where(eq(plans.id, existingPlan.id))
                .returning();
            return updated;
        }
        
        const [created] = await db
            .insert(plans)
            .values({
                stripeProductId,
                name,
                type,
                dailyMessages,
                monthlyMessages,
            })
            .returning();
        
        return created;
    },

    // Create or update price
    async upsertPrice({
        stripePriceId,
        planId,
        pricePerMonth,
    }: {
        stripePriceId: string;
        planId: string;
        pricePerMonth: number;
    }) {
        const existingPrice = await this.getPriceByStripePriceId(stripePriceId);
        
        if (existingPrice) {
            const [updated] = await db
                .update(prices)
                .set({ pricePerMonth })
                .where(eq(prices.id, existingPrice.id))
                .returning();
            return updated;
        }
        
        const [created] = await db
            .insert(prices)
            .values({
                stripePriceId,
                planId,
                pricePerMonth,
            })
            .returning();
        
        return created;
    },
};