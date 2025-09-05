import { relations, sql } from 'drizzle-orm';
import { boolean, index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { frames } from '../canvas/frame';
import { projects } from './project';

export const PROJECT_BRANCH_RELATION_NAME = 'project_branch';

export const branches = pgTable('branches', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'cascade', onUpdate: 'cascade' }),

    // branch metadata
    name: varchar('name').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    isDefault: boolean('is_default').default(false).notNull(),

    // git
    gitBranch: varchar('git_branch'),
    gitCommitSha: varchar('git_commit_sha'),
    gitRepoUrl: varchar('git_repo_url'),

    // sandbox 
    sandboxId: varchar('sandbox_id').notNull(),
}, (table) => [
    index('branches_project_id_idx').on(table.projectId),
    uniqueIndex('branches_name_per_project_ux').on(table.projectId, table.name),
    uniqueIndex('branches_default_per_project_ux')
        .on(table.projectId)
        .where(sql`${table.isDefault} = true`),
]).enableRLS();
export const branchInsertSchema = createInsertSchema(branches);
export const branchUpdateSchema = createUpdateSchema(branches, {
    id: z.string().uuid(),
});

export const branchRelations = relations(branches, ({ one, many }) => ({
    project: one(projects, {
        fields: [branches.projectId],
        references: [projects.id],
        relationName: PROJECT_BRANCH_RELATION_NAME,
    }),
    frames: many(frames),
}));

export type Branch = typeof branches.$inferSelect;
export type NewBranch = typeof branches.$inferInsert;