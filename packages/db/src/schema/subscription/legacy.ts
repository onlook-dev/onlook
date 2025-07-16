import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const legacySubscriptions = pgTable('legacy_subscriptions', {
    email: text('email').notNull().unique().primaryKey(),
    stripeCouponId: text('stripe_coupon_id').notNull(),
    stripePromotionCodeId: text('stripe_promotion_code_id').notNull(),
    stripePromotionCode: text('stripe_promotion_code').notNull(),
    redeemAt: timestamp('redeem_at', { withTimezone: true }),
    redeemBy: timestamp('redeem_by', { withTimezone: true }),
}).enableRLS();
