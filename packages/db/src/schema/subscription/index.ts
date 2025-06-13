import { boolean, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export enum SubscriptionPlans {
    FREE = 'free',
    PRO = 'pro',
}

const subscriptionPlanType = pgEnum('subscription_plan_type', SubscriptionPlans)

export const plans = pgTable('plans', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    dailyMessages: integer('daily_messages').notNull(),
    monthlyMessages: integer('monthly_messages').notNull(),
    stripeProductId: text('stripe_product_id').notNull(),
})

export const planPrices = pgTable('plan_prices', {
    id: uuid('id').defaultRandom().primaryKey(),
    planId: text('plan_id').notNull().references(() => plans.id),
    type: subscriptionPlanType('type').notNull(),
    pricePerMonth: integer('price_per_month').notNull(),
    stripePriceId: text('stripe_price_id').notNull(),
})

export const subscriptions = pgTable('subscriptions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull(),
    planId: text('plan_id').notNull().references(() => plans.id),
    priceId: uuid('price_id').notNull().references(() => planPrices.id),
    stripeSubscriptionId: text('stripe_subscription_id').notNull(),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }),
    status: text('status', { enum: ['active', 'canceled', 'past_due', 'incomplete'] }).notNull(),
})

export const usageRecords = pgTable('usage_records', {
    id: uuid('id').defaultRandom().primaryKey(),
    subscriptionId: uuid('subscription_id').notNull().references(() => subscriptions.id),
    messageCount: integer('message_count').notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    reportedToStripe: boolean('reported_to_stripe').notNull().default(false),
})
