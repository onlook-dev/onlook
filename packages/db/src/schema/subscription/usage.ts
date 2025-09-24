import { UsageType } from '@onlook/models';
import { relations } from 'drizzle-orm';
import { index, pgEnum, pgTable, timestamp, unique, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from '../user';

export const usageTypes = pgEnum('usage_types', UsageType);

export const usageRecords = pgTable('usage_records', {
    id: uuid('id').defaultRandom().primaryKey(),

    // Relationships
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),

    // Metadata
    type: usageTypes('type').default(UsageType.MESSAGE).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    traceId: varchar('trace_id', { length: 255 }),
}, (table) => [
    index('usage_records_user_time_idx').on(table.userId, table.timestamp),
    unique('usage_records_user_trace_idx').on(table.userId, table.traceId)
]).enableRLS();

export const usageRelations = relations(usageRecords, ({ one }) => ({
    user: one(users, {
        fields: [usageRecords.userId],
        references: [users.id],
    })
}))

export type UsageRecord = typeof usageRecords.$inferSelect;