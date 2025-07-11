import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const customDomains = pgTable('custom_domains', {
    id: uuid('id').primaryKey().defaultRandom(),
    apexDomain: text('apex_domain').notNull().unique(),
    verified: boolean('verified').default(false).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export type CustomDomain = typeof customDomains.$inferSelect;