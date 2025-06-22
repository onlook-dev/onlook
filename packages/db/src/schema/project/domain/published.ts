import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from '../project';
import { customDomains } from './custom';

export const PUBLISHED_DOMAIN_PROJECT_RELATION_NAME = 'published_domain_project';

export const publishedDomains = pgTable('published_domains', {
    id: uuid('id').primaryKey().defaultRandom(),
    domainId: uuid('domain_id').references(() => customDomains.id).unique(),
    projectId: uuid('project_id').references(() => projects.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    fullDomain: text('full_domain').notNull().unique(),
}).enableRLS();

export const publishedDomainRelations = relations(publishedDomains, ({ one }) => ({
    customDomain: one(customDomains, {
        fields: [publishedDomains.domainId],
        references: [customDomains.id],
    }),
    project: one(projects, {
        fields: [publishedDomains.projectId],
        references: [projects.id],
        relationName: PUBLISHED_DOMAIN_PROJECT_RELATION_NAME,
    }),
}));

export type PublishedDomain = typeof publishedDomains.$inferSelect;