import { ProductType } from '@onlook/stripe';
import { pgEnum, pgTable, text, uuid } from 'drizzle-orm/pg-core';

export const productType = pgEnum('product_type', ProductType)

export const products = pgTable('products', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    type: productType('type').notNull(),

    // Stripe
    stripeProductId: text('stripe_product_id').notNull().unique(),
}).enableRLS();

export type Product = typeof products.$inferSelect;
