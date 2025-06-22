import { VerificationRequestStatus } from '@onlook/models';
import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from '../project';
import { customDomains } from './custom';

export const verificationRequestStatus = pgEnum('verification_request_status', VerificationRequestStatus);

export const customDomainVerification = pgTable('custom_domain_verification', {
    id: uuid('id').primaryKey().defaultRandom(),
    domainId: uuid('domain_id').references(() => customDomains.id).notNull(),
    projectId: uuid('project_id').references(() => projects.id).notNull(),
    verificationId: text('verification_id').notNull(),
    verificationCode: text('verification_code').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    status: verificationRequestStatus('status').default(VerificationRequestStatus.ACTIVE).notNull(),
}).enableRLS();

export const customDomainVerificationRelations = relations(customDomainVerification, ({ one }) => ({
    customDomain: one(customDomains, {
        fields: [customDomainVerification.domainId],
        references: [customDomains.id],
    }),
}));
