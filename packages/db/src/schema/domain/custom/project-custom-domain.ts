import { relations } from 'drizzle-orm';
import { pgTable, primaryKey, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from '../../project';
import { customDomains } from './domain';

export const PROJECT_CUSTOM_DOMAIN_PROJECT_RELATION_NAME = 'project_custom_domain_project';

export const projectCustomDomains = pgTable('project_custom_domains', {
    customDomainId: uuid('custom_domain_id').notNull().references(() => customDomains.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    fullDomain: text('full_domain').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [primaryKey({ columns: [table.customDomainId, table.projectId] })],
).enableRLS();

export const publishedDomainRelations = relations(projectCustomDomains, ({ one }) => ({
    customDomain: one(customDomains, {
        fields: [projectCustomDomains.customDomainId],
        references: [customDomains.id],
    }),
    project: one(projects, {
        fields: [projectCustomDomains.projectId],
        references: [projects.id],
        relationName: PROJECT_CUSTOM_DOMAIN_PROJECT_RELATION_NAME,
    }),
}));

export type ProjectCustomDomain = typeof projectCustomDomains.$inferSelect;