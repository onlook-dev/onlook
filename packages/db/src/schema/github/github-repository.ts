import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { projects } from '../project';
import { githubIntegrations } from './github-integration';

export const GITHUB_REPOSITORY_PROJECT_RELATION_NAME = 'githubRepositoryProject';

export const githubRepositories = pgTable('github_repositories', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    
    // GitHub repository metadata
    githubRepoId: varchar('github_repo_id').notNull(),
    name: varchar('name').notNull(),
    fullName: varchar('full_name').notNull(),
    owner: varchar('owner').notNull(),
    defaultBranch: varchar('default_branch').notNull().default('main'),
    isPrivate: boolean('is_private').notNull().default(false),
    
    // Repository URLs
    htmlUrl: varchar('html_url').notNull(),
    cloneUrl: varchar('clone_url').notNull(),
    
    // Integration metadata
    connectedAt: timestamp('connected_at', { withTimezone: true }).defaultNow().notNull(),
    connectedBy: uuid('connected_by').notNull(), // user id
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const githubRepositoryInsertSchema = createInsertSchema(githubRepositories);
export const githubRepositoryUpdateSchema = createUpdateSchema(githubRepositories, {
    id: z.string().uuid(),
    projectId: z.string().uuid(),
});

export const githubRepositoryRelations = relations(githubRepositories, ({ one, many }) => ({
    project: one(projects, {
        fields: [githubRepositories.projectId],
        references: [projects.id],
        relationName: GITHUB_REPOSITORY_PROJECT_RELATION_NAME,
    }),
    integrations: many(githubIntegrations),
}));

export type GitHubRepository = typeof githubRepositories.$inferSelect;
export type NewGitHubRepository = typeof githubRepositories.$inferInsert;