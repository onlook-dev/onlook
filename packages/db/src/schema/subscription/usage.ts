import { UsageType } from '@onlook/models';
import { relations } from 'drizzle-orm';
import { index, pgEnum, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { users } from '../user';

export const usageTypes = pgEnum('usage_types', UsageType);

export const usageRecords = pgTable('usage_records', {
    id: uuid('id').defaultRandom().primaryKey(),

    // Relationships
    userId: uuid('user_id').notNull().references(() => users.id),

    // Metadata
    type: usageTypes('type').default(UsageType.MESSAGE).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
}, (table) => [
    index('usage_records_user_time_idx').on(table.userId, table.timestamp)
]).enableRLS();

export const usageRelations = relations(usageRecords, ({ one }) => ({
    user: one(users, {
        fields: [usageRecords.userId],
        references: [users.id],
    })
}))

export type UsageRecord = typeof usageRecords.$inferSelect;