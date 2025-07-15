import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from '../project';

export const PREVIEW_DOMAIN_PROJECT_RELATION_NAME = 'preview_domain_project';

export const previewDomains = pgTable('preview_domains', {
    id: uuid('id').primaryKey().defaultRandom(),
    fullDomain: text('full_domain').notNull().unique(),
    projectId: uuid('project_id').references(() => projects.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const previewDomainRelations = relations(previewDomains, ({ one }) => ({
    project: one(projects, {
        fields: [previewDomains.projectId],
        references: [projects.id],
        relationName: PREVIEW_DOMAIN_PROJECT_RELATION_NAME,
    }),
}));

export type PreviewDomain = typeof previewDomains.$inferSelect;