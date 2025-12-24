import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar, integer, jsonb } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { figmaFiles } from './figma-file';

export const figmaAssets = pgTable('figma_assets', {
    id: uuid('id').primaryKey().defaultRandom(),
    figmaFileId: uuid('figma_file_id').references(() => figmaFiles.id, { onDelete: 'cascade' }).notNull(),
    
    // Figma asset metadata
    figmaAssetId: varchar('figma_asset_id').notNull(),
    name: varchar('name').notNull(),
    type: varchar('type').notNull(), // 'image', 'icon', 'media'
    format: varchar('format').notNull(), // 'png', 'jpg', 'svg', etc.
    
    // Asset storage
    originalUrl: varchar('original_url').notNull(),
    localPath: varchar('local_path'),
    optimizedPath: varchar('optimized_path'),
    size: integer('size'), // file size in bytes
    
    // Asset properties
    dimensions: jsonb('dimensions'), // { width: number, height: number }
    metadata: jsonb('metadata'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const figmaAssetInsertSchema = createInsertSchema(figmaAssets);
export const figmaAssetUpdateSchema = createUpdateSchema(figmaAssets, {
    id: z.string().uuid(),
    figmaFileId: z.string().uuid(),
});

export const figmaAssetRelations = relations(figmaAssets, ({ one }) => ({
    figmaFile: one(figmaFiles, {
        fields: [figmaAssets.figmaFileId],
        references: [figmaFiles.id],
    }),
}));

export type FigmaAsset = typeof figmaAssets.$inferSelect;
export type NewFigmaAsset = typeof figmaAssets.$inferInsert;