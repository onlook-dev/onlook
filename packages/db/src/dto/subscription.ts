import type { Plan, Subscription } from '@onlook/models';
import type { Plan as DbPlan, Subscription as DbSubscription, prices } from '../schema';

export function toSubscription(subscription: DbSubscription & { plan: DbPlan }): Subscription {
    return {
        id: subscription.id,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        plan: toPlan(subscription.plan),
    };
}

export function toPlan(plan: DbPlan): Plan {
    return {
        name: plan.name,
        type: plan.type,
        dailyMessages: plan.dailyMessages,
        monthlyMessages: plan.monthlyMessages,
    };
}

export interface SubscriptionWithPrice extends DbSubscription {
    plan: DbPlan;
    price: typeof prices.$inferSelect;
}

export function toSubscriptionWithPrice(subscription: SubscriptionWithPrice) {
    return {
        ...toSubscription(subscription),
        priceId: subscription.price.stripePriceId,
        pricePerMonth: subscription.price.pricePerMonth,
    };
}