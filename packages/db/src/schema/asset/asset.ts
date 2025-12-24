import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid, varchar, integer, jsonb, boolean } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { projects } from '../project';
import { assetReferences } from './asset-reference';

export const ASSET_PROJECT_RELATION_NAME = 'assetProject';

export const assets = pgTable('assets', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    
    // Asset metadata
    name: varchar('name').notNull(),
    type: varchar('type').notNull(), // 'image', 'icon', 'media', 'document'
    format: varchar('format').notNull(), // 'png', 'jpg', 'svg', 'pdf', etc.
    size: integer('size').notNull(), // file size in bytes
    
    // Storage paths
    originalPath: varchar('original_path').notNull(),
    optimizedPath: varchar('optimized_path'),
    thumbnailPath: varchar('thumbnail_path'),
    
    // URLs
    url: varchar('url').notNull(),
    optimizedUrl: varchar('optimized_url'),
    thumbnailUrl: varchar('thumbnail_url'),
    
    // Asset properties
    dimensions: jsonb('dimensions'), // { width: number, height: number }
    metadata: jsonb('metadata'), // color profile, compression, etc.
    
    // Usage flags
    isReference: boolean('is_reference').notNull().default(false),
    
    // Upload metadata
    uploadedBy: uuid('uploaded_by').notNull(), // user id
    source: varchar('source'), // 'upload', 'figma', 'url', etc.
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const assetInsertSchema = createInsertSchema(assets);
export const assetUpdateSchema = createUpdateSchema(assets, {
    id: z.string().uuid(),
    projectId: z.string().uuid(),
});

export const assetRelations = relations(assets, ({ one, many }) => ({
    project: one(projects, {
        fields: [assets.projectId],
        references: [projects.id],
        relationName: ASSET_PROJECT_RELATION_NAME,
    }),
    references: many(assetReferences),
}));

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;