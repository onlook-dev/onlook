import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const legacySubscriptions = pgTable('legacy_subscriptions', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Relationships
    email: text('email').notNull(),
    couponCode: text('coupon_code').notNull(),
    couponId: uuid('coupon_id').notNull(),
    redeemAt: timestamp('redeem_date', { withTimezone: true })
}).enableRLS();
