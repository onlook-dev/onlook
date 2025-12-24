import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { projects } from '../project';
import { mcpServers } from './mcp-server';

export const MCP_CONFIG_PROJECT_RELATION_NAME = 'mcpConfigProject';

export const mcpConfigs = pgTable('mcp_configs', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    
    // Configuration metadata
    name: varchar('name').notNull(),
    description: varchar('description'),
    
    // MCP configuration
    config: jsonb('config').notNull(), // MCP server configuration
    autoApprove: varchar('auto_approve').array().default([]), // auto-approved tool names
    
    // Status
    enabled: boolean('enabled').notNull().default(true),
    
    // Setup metadata
    setupBy: uuid('setup_by').notNull(), // user id
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const mcpConfigInsertSchema = createInsertSchema(mcpConfigs);
export const mcpConfigUpdateSchema = createUpdateSchema(mcpConfigs, {
    id: z.string().uuid(),
    projectId: z.string().uuid(),
});

export const mcpConfigRelations = relations(mcpConfigs, ({ one, many }) => ({
    project: one(projects, {
        fields: [mcpConfigs.projectId],
        references: [projects.id],
        relationName: MCP_CONFIG_PROJECT_RELATION_NAME,
    }),
    servers: many(mcpServers),
}));

export type McpConfig = typeof mcpConfigs.$inferSelect;
export type NewMcpConfig = typeof mcpConfigs.$inferInsert;