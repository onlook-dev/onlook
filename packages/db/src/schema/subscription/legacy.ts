import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const legacySubscriptions = pgTable('legacy_subscriptions', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Relationships
    email: text('email').notNull(),
    stripeCouponId: text('stripe_coupon_id').notNull(),
    stripePromotionCodeId: text('stripe_promotion_code_id').notNull(),
    stripePromotionCode: text('stripe_promotion_code').notNull(),
    redeemAt: timestamp('redeem_date', { withTimezone: true })
}).enableRLS();
