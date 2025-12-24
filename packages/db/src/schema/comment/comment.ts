import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { projects } from '../project';
import { commentMentions } from './comment-mention';

export const COMMENT_PROJECT_RELATION_NAME = 'commentProject';

export const comments = pgTable('comments', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    
    // Comment metadata
    elementId: varchar('element_id').notNull(), // DOM element identifier
    elementSelector: varchar('element_selector').notNull(), // CSS selector
    pageUrl: varchar('page_url').notNull(),
    
    // Comment content
    content: text('content').notNull(),
    status: varchar('status').notNull().default('open'), // 'open', 'resolved', 'closed'
    
    // Position information
    position: jsonb('position').notNull(), // { x: number, y: number }
    
    // Thread information
    parentId: uuid('parent_id'), // for replies - will be self-referenced in relations
    threadId: uuid('thread_id'), // groups related comments
    
    // User information
    userId: uuid('user_id').notNull(),
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const commentInsertSchema = createInsertSchema(comments);
export const commentUpdateSchema = createUpdateSchema(comments, {
    id: z.string().uuid(),
    projectId: z.string().uuid(),
});

export const commentRelations = relations(comments, ({ one, many }) => ({
    project: one(projects, {
        fields: [comments.projectId],
        references: [projects.id],
        relationName: COMMENT_PROJECT_RELATION_NAME,
    }),
    parent: one(comments, {
        fields: [comments.parentId],
        references: [comments.id],
    }),
    replies: many(comments),
    mentions: many(commentMentions),
}));

export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;