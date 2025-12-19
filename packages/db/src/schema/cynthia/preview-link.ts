import { pgTable, text, timestamp, uuid, unique } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
import { buildSessions } from './build-session';

// Preview links table
export const previewLinks = pgTable(
    'preview_links',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),

        // Build session relationship
        buildSessionId: uuid('build_session_id')
            .notNull()
            .references(() => buildSessions.id, {
                onDelete: 'cascade',
                onUpdate: 'cascade',
            }),

        // Public slug for sharing
        slug: text('slug').notNull(),

        // Optional expiration
        expiresAt: timestamp('expires_at', { withTimezone: true }),
    },
    (table) => ({
        // Unique slug constraint
        slugUnique: unique().on(table.slug),
    }),
).enableRLS();

// Relations
export const previewLinkRelations = relations(previewLinks, ({ one }) => ({
    buildSession: one(buildSessions, {
        fields: [previewLinks.buildSessionId],
        references: [buildSessions.id],
    }),
}));

// Zod schemas
export const previewLinkInsertSchema = createInsertSchema(previewLinks, {
    slug: z.string().min(8).max(20),
    buildSessionId: z.string().uuid(),
});

// Types
export type PreviewLink = typeof previewLinks.$inferSelect;
export type NewPreviewLink = typeof previewLinks.$inferInsert;
