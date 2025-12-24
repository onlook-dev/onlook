import { relations } from 'drizzle-orm';
import { jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from '../user';

// deprecated
export const feedbacks = pgTable('feedbacks', {
    id: uuid('id').primaryKey().defaultRandom().notNull(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
    email: text('email'),
    message: text('message').notNull(),
    pageUrl: text('page_url'),
    userAgent: text('user_agent'),
    attachments: jsonb('attachments').$type<Array<{
        name: string;
        size: number;
        type: string;
        url: string;
        uploadedAt: string;
    }>>().default([]).notNull(),
    metadata: jsonb('metadata').$type<Record<string, any>>().default({}).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const feedbacksRelations = relations(feedbacks, ({ one }) => ({
    user: one(users, {
        fields: [feedbacks.userId],
        references: [users.id],
    }),
}));

const attachmentSchema = z.object({
    name: z.string(),
    size: z.number().min(0),
    type: z.string(),
    url: z.string().url(),
    uploadedAt: z.string(),
});

export const feedbackInsertSchema = createInsertSchema(feedbacks, {
    message: z.string().min(1, 'Message is required').max(5000, 'Message is too long'),
    email: z.string().email('Invalid email format').optional(),
    pageUrl: z.url('Invalid URL format').optional(),
    attachments: z.array(attachmentSchema).default([]),
    metadata: z.record(z.string(), z.any()).default({}),
});

export const feedbackSubmitSchema = feedbackInsertSchema.pick({
    message: true,
    email: true,
    pageUrl: true,
    userAgent: true,
    attachments: true,
    metadata: true,
});

export type Feedback = typeof feedbacks.$inferSelect;
export type NewFeedback = typeof feedbacks.$inferInsert;
export type FeedbackSubmitInput = z.infer<typeof feedbackSubmitSchema>;