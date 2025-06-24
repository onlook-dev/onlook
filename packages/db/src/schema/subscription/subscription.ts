import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../user/user';
import { prices } from './price';
import { products } from './product';
import { usageRecords } from './usage';

export const subscriptions = pgTable('subscriptions', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Relationships
    userId: uuid('user_id').notNull().references(() => users.id),
    productId: uuid('product_id').notNull().references(() => products.id),
    priceId: uuid('price_id').notNull().references(() => prices.id),

    // Metadata
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    status: text('status', { enum: ['active', 'canceled'] }).notNull(),

    // Stripe
    stripeCustomerId: text('stripe_customer_id').notNull(),
    stripeSubscriptionId: text('stripe_subscription_id').notNull(),
    stripeSubscriptionItemId: text('stripe_subscription_item_id').notNull().unique(),

    // Scheduled price change
    scheduledPriceId: uuid('scheduled_price_id').references(() => prices.id),
    scheduledChangeAt: timestamp('scheduled_change_at', { withTimezone: true }),
}).enableRLS();

export const subscriptionRelations = relations(subscriptions, ({ one, many }) => ({
    product: one(products, {
        fields: [subscriptions.productId],
        references: [products.id],
    }),
    price: one(prices, {
        fields: [subscriptions.priceId],
        references: [prices.id],
    }),
    usageRecords: many(usageRecords),
}));

export type Subscription = typeof subscriptions.$inferSelect;