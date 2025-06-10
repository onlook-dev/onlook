import { DomainVerificationStatus } from '@onlook/models';
import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from '../project';
import { publishedDomains } from './published';

export const domainStatus = pgEnum('status', DomainVerificationStatus);

export const customDomains = pgTable('custom_domains', {
    id: uuid('id').primaryKey().defaultRandom(),
    apexDomain: text('apex_domain').notNull().unique(),
    verificationStatus: domainStatus('verification_status').default(DomainVerificationStatus.PENDING),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customDomainVerification = pgTable('custom_domain_verification', {
    id: uuid('id').primaryKey().defaultRandom(),
    domainId: uuid('domain_id').references(() => customDomains.id),
    projectId: uuid('project_id').references(() => projects.id),
    verificationId: text('verification_id').notNull(),
    verificationCode: text('verification_code').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const customDomainRelations = relations(customDomains, ({ many }) => ({
    publishedDomains: many(publishedDomains),
    verificationRequests: many(customDomainVerification),
}));

export const customDomainVerificationRelations = relations(customDomainVerification, ({ one }) => ({
    customDomain: one(customDomains, {
        fields: [customDomainVerification.domainId],
        references: [customDomains.id],
    }),
}));
