import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { PROJECT_CUSTOM_DOMAIN_PROJECT_RELATION_NAME, projectCustomDomains } from '../domain';
import { PREVIEW_DOMAIN_PROJECT_RELATION_NAME, previewDomains } from '../domain/preview';
import { userProjects } from '../user';
import { canvases } from './canvas';
import { conversations, PROJECT_CONVERSATION_RELATION_NAME } from './chat/conversation';
import { projectInvitations } from './invitation';
import { projectSettings } from './settings';

export const projects = pgTable('projects', {
    id: uuid('id').primaryKey().defaultRandom(),

    // metadata
    name: varchar('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

    // preview image
    previewImgUrl: varchar('preview_img_url'),
    previewImgPath: varchar('preview_img_path'),
    previewImgBucket: varchar('preview_img_bucket'),

    // sandbox
    sandboxId: varchar('sandbox_id').notNull(),
    sandboxUrl: varchar('sandbox_url').notNull(),
}).enableRLS();

export const projectInsertSchema = createInsertSchema(projects);
export const projectUpdateSchema = createUpdateSchema(projects);

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
    projectCustomDomains: many(projectCustomDomains, {
        relationName: PROJECT_CUSTOM_DOMAIN_PROJECT_RELATION_NAME,
    }),
    previewDomains: many(previewDomains, {
        relationName: PREVIEW_DOMAIN_PROJECT_RELATION_NAME,
    }),
    settings: one(projectSettings, {
        fields: [projects.id],
        references: [projectSettings.projectId],
    }),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
