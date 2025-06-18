import { relations } from 'drizzle-orm'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import { subscriptions } from './subscription'

export const usageRecords = pgTable('usage_records', {
    id: uuid('id').defaultRandom().primaryKey(),
    subscriptionId: uuid('subscription_id').notNull().references(() => subscriptions.id),
    type: text('type', { enum: ['message'] }).notNull(),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
})

export const usageRelations = relations(usageRecords, ({ one }) => ({
    subscription: one(subscriptions, {
        fields: [usageRecords.subscriptionId],
        references: [subscriptions.id],
    })
}))

export type UsageRecord = typeof usageRecords.$inferSelect;