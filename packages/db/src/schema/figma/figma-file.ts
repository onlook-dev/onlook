import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { projects } from '../project';
import { figmaAssets } from './figma-asset';
import { figmaComponents } from './figma-component';

export const FIGMA_FILE_PROJECT_RELATION_NAME = 'figmaFileProject';

export const figmaFiles = pgTable('figma_files', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    
    // Figma file metadata
    figmaFileId: varchar('figma_file_id').notNull().unique(),
    name: varchar('name').notNull(),
    lastModified: timestamp('last_modified', { withTimezone: true }).notNull(),
    
    // Import metadata
    importedAt: timestamp('imported_at', { withTimezone: true }).defaultNow().notNull(),
    importedBy: uuid('imported_by').notNull(), // user id
    
    // Design tokens and metadata
    designTokens: jsonb('design_tokens'),
    metadata: jsonb('metadata'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const figmaFileInsertSchema = createInsertSchema(figmaFiles);
export const figmaFileUpdateSchema = createUpdateSchema(figmaFiles, {
    id: z.string().uuid(),
    projectId: z.string().uuid(),
});

export const figmaFileRelations = relations(figmaFiles, ({ one, many }) => ({
    project: one(projects, {
        fields: [figmaFiles.projectId],
        references: [projects.id],
        relationName: FIGMA_FILE_PROJECT_RELATION_NAME,
    }),
    assets: many(figmaAssets),
    components: many(figmaComponents),
}));

export type FigmaFile = typeof figmaFiles.$inferSelect;
export type NewFigmaFile = typeof figmaFiles.$inferInsert;