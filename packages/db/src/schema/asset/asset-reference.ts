import { relations } from 'drizzle-orm';
import { pgTable, timestamp, uuid, varchar, text } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { assets } from './asset';

export const assetReferences = pgTable('asset_references', {
    id: uuid('id').primaryKey().defaultRandom(),
    assetId: uuid('asset_id').references(() => assets.id, { onDelete: 'cascade' }).notNull(),
    
    // Reference location
    filePath: varchar('file_path').notNull(), // file where asset is referenced
    lineNumber: varchar('line_number'), // line number in file
    importStatement: text('import_statement'), // generated import code
    
    // Reference metadata
    referenceType: varchar('reference_type').notNull(), // 'import', 'url', 'inline'
    componentName: varchar('component_name'), // component using the asset
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}).enableRLS();

export const assetReferenceInsertSchema = createInsertSchema(assetReferences);
export const assetReferenceUpdateSchema = createUpdateSchema(assetReferences, {
    id: z.string().uuid(),
    assetId: z.string().uuid(),
});

export const assetReferenceRelations = relations(assetReferences, ({ one }) => ({
    asset: one(assets, {
        fields: [assetReferences.assetId],
        references: [assets.id],
    }),
}));

export type AssetReference = typeof assetReferences.$inferSelect;
export type NewAssetReference = typeof assetReferences.$inferInsert;