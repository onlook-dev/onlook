import { pgEnum, pgTable, uuid, text, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { audits } from './audit';
import { users } from '../user';

// Fix pack type enum
export const fixPackType = pgEnum('fix_pack_type', [
    'token',      // Design tokens (colors, typography, spacing)
    'layout',     // Layout/hierarchy fixes
    'component',  // Component-level fixes
    'motion',     // Animation/motion fixes
    'content',    // Content/copy improvements
]);

// Fix packs table
export const fixPacks = pgTable('fix_packs', {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

    // Relationships
    auditId: uuid('audit_id')
        .notNull()
        .references(() => audits.id, {
            onDelete: 'cascade',
            onUpdate: 'cascade',
        }),
    userId: uuid('user_id')
        .notNull()
        .references(() => users.id, {
            onDelete: 'cascade',
            onUpdate: 'cascade',
        }),

    // Fix pack metadata
    type: fixPackType('type').notNull(),
    title: text('title').notNull(),
    description: text('description').notNull(),

    // Fix pack data
    patchPreview: jsonb('patch_preview').notNull(), // Code diff preview
    filesAffected: jsonb('files_affected').notNull(), // List of file paths
    issuesFixed: jsonb('issues_fixed').notNull(), // Issue IDs from audit

    // Application status
    applied: timestamp('applied_at', { withTimezone: true }), // Null = not applied yet
}).enableRLS();

// Relations
export const fixPackRelations = relations(fixPacks, ({ one }) => ({
    audit: one(audits, {
        fields: [fixPacks.auditId],
        references: [audits.id],
    }),
    user: one(users, {
        fields: [fixPacks.userId],
        references: [users.id],
    }),
}));

// Zod schemas
export const fixPackInsertSchema = createInsertSchema(fixPacks, {
    type: z.enum(['token', 'layout', 'component', 'motion', 'content']),
    title: z.string().min(1),
    description: z.string().min(1),
});

export const fixPackUpdateSchema = createUpdateSchema(fixPacks);

// Types
export type FixPack = typeof fixPacks.$inferSelect;
export type NewFixPack = typeof fixPacks.$inferInsert;
