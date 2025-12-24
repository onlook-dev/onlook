import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { githubRepositories } from './github-repository';

export const githubIntegrations = pgTable('github_integrations', {
    id: uuid('id').primaryKey().defaultRandom(),
    repositoryId: uuid('repository_id').references(() => githubRepositories.id, { onDelete: 'cascade' }).notNull(),
    
    // Pull request metadata
    prNumber: varchar('pr_number'),
    prTitle: varchar('pr_title'),
    prDescription: text('pr_description'),
    branchName: varchar('branch_name'),
    baseBranch: varchar('base_branch').default('main'),
    
    // Integration status
    status: varchar('status').notNull().default('pending'), // 'pending', 'created', 'merged', 'closed'
    
    // Change tracking
    changes: jsonb('changes'), // array of code changes
    commitMessage: text('commit_message'),
    commitSha: varchar('commit_sha'),
    
    // URLs
    prUrl: varchar('pr_url'),
    branchUrl: varchar('branch_url'),
    
    // Metadata
    createdBy: uuid('created_by').notNull(), // user id
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const githubIntegrationInsertSchema = createInsertSchema(githubIntegrations);
export const githubIntegrationUpdateSchema = createUpdateSchema(githubIntegrations, {
    id: z.string().uuid(),
    repositoryId: z.string().uuid(),
});

export const githubIntegrationRelations = relations(githubIntegrations, ({ one }) => ({
    repository: one(githubRepositories, {
        fields: [githubIntegrations.repositoryId],
        references: [githubRepositories.id],
    }),
}));

export type GitHubIntegration = typeof githubIntegrations.$inferSelect;
export type NewGitHubIntegration = typeof githubIntegrations.$inferInsert;