import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { assets, ASSET_PROJECT_RELATION_NAME } from '../asset';
import { canvases } from '../canvas';
import { conversations, PROJECT_CONVERSATION_RELATION_NAME } from '../chat';
import { comments, COMMENT_PROJECT_RELATION_NAME } from '../comment';
import { PREVIEW_DOMAIN_PROJECT_RELATION_NAME, previewDomains, PROJECT_CUSTOM_DOMAIN_PROJECT_RELATION_NAME, projectCustomDomains } from '../domain';
import { figmaFiles, FIGMA_FILE_PROJECT_RELATION_NAME } from '../figma';
import { githubRepositories, GITHUB_REPOSITORY_PROJECT_RELATION_NAME } from '../github';
import { mcpConfigs, MCP_CONFIG_PROJECT_RELATION_NAME } from '../mcp';
import { userProjects } from '../user';
import { branches, PROJECT_BRANCH_RELATION_NAME } from './branch';
import { projectInvitations } from './invitation';
import { projectSettings } from './settings';

export const projects = pgTable('projects', {
    id: uuid('id').primaryKey().defaultRandom(),

    // metadata
    name: varchar('name').notNull(),
    description: text('description'),
    tags: varchar('tags').array().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

    // preview image
    previewImgUrl: varchar('preview_img_url'),
    previewImgPath: varchar('preview_img_path'),
    previewImgBucket: varchar('preview_img_bucket'),
    updatedPreviewImgAt: timestamp('updated_preview_img_at', { withTimezone: true }),

    // deprecated
    sandboxId: varchar('sandbox_id'),
    sandboxUrl: varchar('sandbox_url'),
}).enableRLS();

export const projectInsertSchema = createInsertSchema(projects);
export const projectUpdateSchema = createUpdateSchema(projects, {
    id: z.string().uuid(),
});

export const projectRelations = relations(projects, ({ one, many }) => ({
    canvas: one(canvases, {
        fields: [projects.id],
        references: [canvases.projectId],
    }),
    userProjects: many(userProjects),
    conversations: many(conversations, {
        relationName: PROJECT_CONVERSATION_RELATION_NAME,
    }),
    projectInvitations: many(projectInvitations),
    projectCustomDomains: many(projectCustomDomains, {
        relationName: PROJECT_CUSTOM_DOMAIN_PROJECT_RELATION_NAME,
    }),
    previewDomains: many(previewDomains, {
        relationName: PREVIEW_DOMAIN_PROJECT_RELATION_NAME,
    }),
    settings: one(projectSettings, {
        fields: [projects.id],
        references: [projectSettings.projectId],
    }),
    branches: many(branches, {
        relationName: PROJECT_BRANCH_RELATION_NAME,
    }),
    // Platform extensions relations
    figmaFiles: many(figmaFiles, {
        relationName: FIGMA_FILE_PROJECT_RELATION_NAME,
    }),
    githubRepositories: many(githubRepositories, {
        relationName: GITHUB_REPOSITORY_PROJECT_RELATION_NAME,
    }),
    comments: many(comments, {
        relationName: COMMENT_PROJECT_RELATION_NAME,
    }),
    assets: many(assets, {
        relationName: ASSET_PROJECT_RELATION_NAME,
    }),
    mcpConfigs: many(mcpConfigs, {
        relationName: MCP_CONFIG_PROJECT_RELATION_NAME,
    }),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
