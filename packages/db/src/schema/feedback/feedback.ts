import { relations } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from '../user';

export const feedbacks = pgTable('feedbacks', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    email: text('email'),
    message: text('message').notNull(),
    pageUrl: text('page_url'),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const feedbacksRelations = relations(feedbacks, ({ one }) => ({
    user: one(users, {
        fields: [feedbacks.userId],
        references: [users.id],
    }),
}));

export const feedbackInsertSchema = createInsertSchema(feedbacks, {
    message: z.string().min(1, 'Message is required').max(5000, 'Message is too long'),
    email: z.string().email('Invalid email format').optional(),
    pageUrl: z.string().url('Invalid URL format').optional(),
    metadata: z.record(z.any()).default({}),
});

export const feedbackSubmitSchema = feedbackInsertSchema.pick({
    message: true,
    email: true,
    pageUrl: true,
    userAgent: true,
    metadata: true,
});

export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;
export type FeedbackSubmitInput = z.infer<typeof feedbackSubmitSchema>;