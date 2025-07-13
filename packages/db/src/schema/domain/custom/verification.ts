import { VerificationRequestStatus, type AVerificationRecord, type TxtVerificationRecord } from '@onlook/models';
import { relations } from 'drizzle-orm';
import { jsonb, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { projects } from '../../project';
import { customDomains } from './domain';

export const verificationRequestStatus = pgEnum('verification_request_status', VerificationRequestStatus);

export const customDomainVerification = pgTable('custom_domain_verification', {
    id: uuid('id').primaryKey().defaultRandom(),
    customDomainId: uuid('custom_domain_id').references(() => customDomains.id).notNull(),
    projectId: uuid('project_id').references(() => projects.id).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

    fullDomain: text('full_domain').notNull(),
    freestyleVerificationId: text('freestyle_verification_id').notNull(),
    txtRecord: jsonb('txt_record').notNull().$type<TxtVerificationRecord>(),
    aRecords: jsonb('a_records').notNull().$type<AVerificationRecord[]>().default([]),
    status: verificationRequestStatus('status').default(VerificationRequestStatus.PENDING).notNull(),
}).enableRLS();

export const customDomainVerificationRelations = relations(customDomainVerification, ({ one }) => ({
    customDomain: one(customDomains, {
        fields: [customDomainVerification.customDomainId],
        references: [customDomains.id],
    }),
}));

export type CustomDomainVerification = typeof customDomainVerification.$inferSelect;