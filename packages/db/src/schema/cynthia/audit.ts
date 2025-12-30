import { AuditStatus } from '@onlook/models';
import { relations } from 'drizzle-orm';
import { integer, jsonb, pgEnum, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { projects } from '../project';
import { users } from '../user';

export const auditStatus = pgEnum('audit_status', [
    AuditStatus.PENDING,
    AuditStatus.RUNNING,
    AuditStatus.COMPLETED,
    AuditStatus.FAILED,
]);

export const audits = pgTable('cynthia_audits', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    status: auditStatus('status').default(AuditStatus.PENDING).notNull(),
    targetType: varchar('target_type', { length: 50 }).notNull(),
    targetValue: text('target_value').notNull(),
    context: jsonb('context'),
    constraints: jsonb('constraints'),
    overallScore: integer('overall_score'),
    udecScores: jsonb('udec_scores'),
    issuesFoundTotal: integer('issues_found_total'),
    teaserIssues: jsonb('teaser_issues'),
    fullIssues: jsonb('full_issues'),
    fixPacks: jsonb('fix_packs'),
    tokenChanges: jsonb('token_changes'),
    patchPlan: jsonb('patch_plan'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
}).enableRLS();

export const auditInsertSchema = createInsertSchema(audits, {
    status: z.enum([AuditStatus.PENDING, AuditStatus.RUNNING, AuditStatus.COMPLETED, AuditStatus.FAILED]).optional(),
    targetType: z.enum(['url', 'screenshot', 'frame', 'component']),
});

export const auditUpdateSchema = createUpdateSchema(audits, {
    id: z.uuid(),
    status: z.enum([AuditStatus.PENDING, AuditStatus.RUNNING, AuditStatus.COMPLETED, AuditStatus.FAILED]).optional(),
});

export const auditRelations = relations(audits, ({ one }) => ({
    project: one(projects, {
        fields: [audits.projectId],
        references: [projects.id],
    }),
    user: one(users, {
        fields: [audits.userId],
        references: [users.id],
    }),
}));

export type Audit = typeof audits.$inferSelect;
export type NewAudit = typeof audits.$inferInsert;
