import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from '../project';
import { VERIFIED_DOMAIN_PUBLISHED_RELATION_NAME, verifiedDomains } from './verified';

export const PUBLISHED_DOMAIN_PROJECT_RELATION_NAME = 'published_domain_project';

export const publishedDomains = pgTable('published_domains', {
    id: uuid('id').primaryKey().defaultRandom(),
    domainId: uuid('domain_id').references(() => verifiedDomains.id),
    projectId: uuid('project_id').references(() => projects.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const publishedDomainRelations = relations(publishedDomains, ({ one }) => ({
    verifiedDomain: one(verifiedDomains, {
        fields: [publishedDomains.domainId],
        references: [verifiedDomains.id],
        relationName: VERIFIED_DOMAIN_PUBLISHED_RELATION_NAME,
    }),
    project: one(projects, {
        fields: [publishedDomains.projectId],
        references: [projects.id],
    }),
}));
