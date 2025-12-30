import { pgEnum, pgTable, text, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from '../user';
import { audits } from './audit';
import { fixPacks } from './fix-pack';

/**
 * Apply run status enum
 * Phase 5: Tracks autonomous GitHub PR creation and OpenHands repair loop
 */
export const applyRunStatus = pgEnum('apply_run_status', [
    'queued',
    'running',
    'branch_created',
    'pr_opened',
    'checks_running',
    'success',
    'failed',
]);

/**
 * Apply runs table
 * Phase 5: Tracks fix pack application attempts via GitHub PR + OpenHands
 */
export const applyRuns = pgTable('apply_runs', {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

    // Ownership
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, {
            onDelete: 'cascade',
            onUpdate: 'cascade',
        }),

    // Source references
    auditId: uuid('audit_id')
        .notNull()
        .references(() => audits.id, {
            onDelete: 'cascade',
            onUpdate: 'cascade',
        }),
    fixPackId: uuid('fix_pack_id')
        .notNull()
        .references(() => fixPacks.id, {
            onDelete: 'cascade',
            onUpdate: 'cascade',
        }),

    // Status tracking
    status: applyRunStatus('status').notNull().default('queued'),

    // GitHub integration
    repoOwner: text('repo_owner').notNull(),
    repoName: text('repo_name').notNull(),
    branch: text('branch'),
    prNumber: integer('pr_number'),
    prUrl: text('pr_url'),

    // Execution logs and errors
    logs: jsonb('logs'), // Array of { timestamp, message, level }
    error: text('error'),
}).enableRLS();

// Relations
export const applyRunRelations = relations(applyRuns, ({ one }) => ({
    user: one(users, {
        fields: [applyRuns.userId],
        references: [users.id],
    }),
    audit: one(audits, {
        fields: [applyRuns.auditId],
        references: [audits.id],
    }),
    fixPack: one(fixPacks, {
        fields: [applyRuns.fixPackId],
        references: [fixPacks.id],
    }),
}));

// Zod schemas
export const applyRunInsertSchema = createInsertSchema(applyRuns, {
    repoOwner: z.string().min(1),
    repoName: z.string().min(1),
    status: z.enum([
        'queued',
        'running',
        'branch_created',
        'pr_opened',
        'checks_running',
        'success',
        'failed',
    ]),
});

export const applyRunUpdateSchema = createUpdateSchema(applyRuns);

// Types
export type ApplyRun = typeof applyRuns.$inferSelect;
export type NewApplyRun = typeof applyRuns.$inferInsert;
