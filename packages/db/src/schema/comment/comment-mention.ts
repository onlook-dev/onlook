import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { comments } from './comment';

export const commentMentions = pgTable('comment_mentions', {
    id: uuid('id').primaryKey().defaultRandom(),
    commentId: uuid('comment_id').references(() => comments.id, { onDelete: 'cascade' }).notNull(),
    
    // Mentioned user
    mentionedUserId: uuid('mentioned_user_id').notNull(),
    
    // Notification status
    notified: boolean('notified').notNull().default(false),
    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const commentMentionInsertSchema = createInsertSchema(commentMentions);
export const commentMentionUpdateSchema = createUpdateSchema(commentMentions, {
    id: z.string().uuid(),
    commentId: z.string().uuid(),
});

export const commentMentionRelations = relations(commentMentions, ({ one }) => ({
    comment: one(comments, {
        fields: [commentMentions.commentId],
        references: [comments.id],
    }),
}));

export type CommentMention = typeof commentMentions.$inferSelect;
export type NewCommentMention = typeof commentMentions.$inferInsert;