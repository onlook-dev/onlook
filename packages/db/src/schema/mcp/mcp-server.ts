import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { mcpConfigs } from './mcp-config';

export const mcpServers = pgTable('mcp_servers', {
    id: uuid('id').primaryKey().defaultRandom(),
    configId: uuid('config_id').references(() => mcpConfigs.id, { onDelete: 'cascade' }).notNull(),
    
    // Server metadata
    name: varchar('name').notNull(),
    command: varchar('command').notNull(),
    args: varchar('args').array().default([]),
    
    // Environment and configuration
    env: jsonb('env'), // environment variables
    serverConfig: jsonb('server_config'), // server-specific configuration
    
    // Status
    enabled: boolean('enabled').notNull().default(true),
    status: varchar('status').notNull().default('stopped'), // 'running', 'stopped', 'error'
    
    // Available tools
    availableTools: jsonb('available_tools'), // list of tools provided by server
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const mcpServerInsertSchema = createInsertSchema(mcpServers);
export const mcpServerUpdateSchema = createUpdateSchema(mcpServers, {
    id: z.string().uuid(),
    configId: z.string().uuid(),
});

export const mcpServerRelations = relations(mcpServers, ({ one }) => ({
    config: one(mcpConfigs, {
        fields: [mcpServers.configId],
        references: [mcpConfigs.id],
    }),
}));

export type McpServer = typeof mcpServers.$inferSelect;
export type NewMcpServer = typeof mcpServers.$inferInsert;