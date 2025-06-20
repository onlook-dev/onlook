import { relations } from 'drizzle-orm';
import { integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { products } from './product';

export const prices = pgTable('prices', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Relationships
    productId: uuid('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'cascade', onUpdate: 'cascade' }),

    // Metadata
    monthlyMessageLimit: integer('monthly_message_limit').notNull(),

    // Stripe
    stripePriceId: text('stripe_price_id').notNull(),
})

export const priceRelations = relations(prices, ({ one }) => ({
    product: one(products, {
        fields: [prices.productId],
        references: [products.id],
    }),
}));

export type Price = typeof prices.$inferSelect;
