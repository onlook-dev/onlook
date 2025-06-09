import { relations } from 'drizzle-orm';
import { pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { publishedDomains } from './published';

export const VERIFIED_DOMAIN_PUBLISHED_RELATION_NAME = 'verified_domain_published';

export enum DomainStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
}
export const domainStatus = pgEnum('status', DomainStatus);

export const verifiedDomains = pgTable('verified_domains', {
    id: uuid('id').primaryKey().defaultRandom(),
    apexDomain: text('apex_domain').notNull(),
    status: domainStatus('status').default(DomainStatus.PENDING),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const verificationRequests = pgTable('verification_requests', {
    id: uuid('id').primaryKey().defaultRandom(),
    domainId: uuid('domain_id').references(() => verifiedDomains.id),
    verificationCode: text('verification_code').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const verifiedDomainRelations = relations(verifiedDomains, ({ many }) => ({
    publishedDomains: many(publishedDomains, {
        relationName: VERIFIED_DOMAIN_PUBLISHED_RELATION_NAME,
    }),
    verificationRequests: many(verificationRequests),
}));

export const verificationRequestRelations = relations(verificationRequests, ({ one }) => ({
    verifiedDomain: one(verifiedDomains, {
        fields: [verificationRequests.domainId],
        references: [verifiedDomains.id],
    }),
}));