import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { figmaFiles } from './figma-file';

export const figmaComponents = pgTable('figma_components', {
    id: uuid('id').primaryKey().defaultRandom(),
    figmaFileId: uuid('figma_file_id').references(() => figmaFiles.id, { onDelete: 'cascade' }).notNull(),
    
    // Figma component metadata
    figmaComponentId: varchar('figma_component_id').notNull(),
    name: varchar('name').notNull(),
    type: varchar('type').notNull(), // 'component', 'instance', 'frame', etc.
    
    // Component structure
    properties: jsonb('properties'), // component props and variants
    styles: jsonb('styles'), // styling information
    children: jsonb('children'), // nested component structure
    
    // Generated code
    generatedCode: text('generated_code'),
    codeFramework: varchar('code_framework'), // 'react', 'vue', 'angular', etc.
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const figmaComponentInsertSchema = createInsertSchema(figmaComponents);
export const figmaComponentUpdateSchema = createUpdateSchema(figmaComponents, {
    id: z.string().uuid(),
    figmaFileId: z.string().uuid(),
});

export const figmaComponentRelations = relations(figmaComponents, ({ one }) => ({
    figmaFile: one(figmaFiles, {
        fields: [figmaComponents.figmaFileId],
        references: [figmaFiles.id],
    }),
}));

export type FigmaComponent = typeof figmaComponents.$inferSelect;
export type NewFigmaComponent = typeof figmaComponents.$inferInsert;