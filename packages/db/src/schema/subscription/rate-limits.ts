import { relations } from 'drizzle-orm';
import { index, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { subscriptions } from '../subscription';
import { users } from '../user';

export const rateLimits = pgTable('rate_limits', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Relationships
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id),
    subscriptionId: uuid('subscription_id')
        .notNull()
        .references(() => subscriptions.id),

    // Metadata
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),

    // The start and end of the rate limit defines the time period for which the rate limit is applied
    // There can be multiple rate limits per subscription and the range doesn't have to match the subscription's
    // start and end dates.
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }).notNull(),

    // The number of requests that can be made within the time period.
    // For carry-over limits, this reflects the total number of requests that were carried over.
    max: integer('max').notNull(),
    // The number of requests left to make within the time period.
    left: integer('left').notNull().default(0),

    // This key identifies the rate limit that is carried over.
    // Useful for analytics and debugging and possibly displaying to the user.
    carryOverKey: uuid('carry_over_key').notNull(),
    // Track the number of times this rate limit has been carried over.
    carryOverTotal: integer('carry_over_total').notNull().default(0),

    // When upgrading a subscription, the subscription item ID is updated.
    // Due to slight limitations of the Stripe API, we need to track the subscription item ID.
    stripeSubscriptionItemId: text('stripe_subscription_item_id').notNull(),
}, (table) => [
    index('rate_limits_user_time_idx').on(table.userId, table.startedAt, table.endedAt)
]).enableRLS();

export const rateLimitRelations = relations(rateLimits, ({ one, many }) => ({
    user: one(users, {
        fields: [rateLimits.userId],
        references: [users.id],
    }),
    subscription: one(subscriptions, {
        fields: [rateLimits.subscriptionId],
        references: [subscriptions.id],
    }),
}));

export type NewRateLimit = typeof rateLimits.$inferInsert;
export type RateLimit = typeof rateLimits.$inferSelect;
