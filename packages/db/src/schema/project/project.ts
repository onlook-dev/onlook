import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { userProjects } from '../user';
import { canvases } from './canvas';
import { conversations, PROJECT_CONVERSATION_RELATION_NAME } from './chat/conversation';
import { projectInvitations } from './invitation';

export const projects = pgTable('projects', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name').notNull(),
    sandboxId: varchar('sandbox_id').notNull(),
    sandboxUrl: varchar('sandbox_url').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    previewImg: varchar('preview_img'),
    description: text('description'),
}).enableRLS();

export const projectInsertSchema = createInsertSchema(projects);

export const projectRelations = relations(projects, ({ one, many }) => ({
    canvas: one(canvases, {
        fields: [projects.id],
        references: [canvases.projectId],
    }),
    userProjects: many(userProjects),
    conversations: many(conversations, {
        relationName: PROJECT_CONVERSATION_RELATION_NAME,
    }),
    projectInvitations: many(projectInvitations),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
