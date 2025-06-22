import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../user';

export const usageRecords = pgTable('usage_records', {
    id: uuid('id').defaultRandom().primaryKey(),

    // Relationships
    userId: uuid('user_id').notNull().references(() => users.id),

    // Metadata
    type: text('type', { enum: ['message'] }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
}).enableRLS();

export const usageRelations = relations(usageRecords, ({ one }) => ({
    user: one(users, {
        fields: [usageRecords.userId],
        references: [users.id],
    })
}))

export type UsageRecord = typeof usageRecords.$inferSelect;