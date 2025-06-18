import { PlanType } from '@onlook/models';
import { relations } from 'drizzle-orm';
import { integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../user/user';
import { usageRecords } from './usage';

export const subscriptionPlanType = pgEnum('subscription_plan_type', PlanType)

export const plans = pgTable('plans', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    dailyMessages: integer('daily_messages').notNull(),
    monthlyMessages: integer('monthly_messages').notNull(),
    type: subscriptionPlanType('type').notNull(),

    // Stripe
    stripeProductId: text('stripe_product_id').notNull(),
})
export type Plan = typeof plans.$inferSelect;

export const prices = pgTable('prices', {
    id: uuid('id').primaryKey().defaultRandom(),
    planId: uuid('plan_id').notNull().references(() => plans.id),
    pricePerMonth: integer('price_per_month').notNull(),

    // Stripe
    stripePriceId: text('stripe_price_id').notNull(),
})

export const subscriptions = pgTable('subscriptions', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id),
    planId: uuid('plan_id').notNull().references(() => plans.id),
    priceId: uuid('price_id').notNull().references(() => prices.id),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }),
    status: text('status', { enum: ['active', 'canceled', 'past_due', 'incomplete'] }).notNull(),

    // Stripe
    stripeSubscriptionId: text('stripe_subscription_id').notNull(),
})

export const subscriptionRelations = relations(subscriptions, ({ one, many }) => ({
    plan: one(plans, {
        fields: [subscriptions.planId],
        references: [plans.id],
    }),
    price: one(prices, {
        fields: [subscriptions.priceId],
        references: [prices.id],
    }),
    usageRecords: many(usageRecords),
}));

export type Subscription = typeof subscriptions.$inferSelect;