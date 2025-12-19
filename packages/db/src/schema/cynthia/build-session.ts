import { pgEnum, pgTable, text, timestamp, uuid, integer, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from '../user';

// Build session status enum
export const buildSessionStatus = pgEnum('build_session_status', [
    'created',
    'previewed',
    'locked',
    'converted',
]);

// Build session input type enum
export const buildSessionInputType = pgEnum('build_session_input_type', ['idea', 'url']);

// Build sessions table
export const buildSessions = pgTable('build_sessions', {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

    // Session data
    language: text('language').notNull().default('en'), // 'en' | 'es'
    inputType: buildSessionInputType('input_type').notNull(),
    inputValue: text('input_value').notNull(),

    // Audit results (static for Phase 2, real in Phase 3)
    teaserScore: integer('teaser_score'),
    teaserSummary: jsonb('teaser_summary'),

    // Status tracking
    status: buildSessionStatus('status').notNull().default('created'),

    // User relationship (nullable - anonymous sessions allowed)
    userId: uuid('user_id').references(() => users.id, {
        onDelete: 'set null',
        onUpdate: 'cascade',
    }),
}).enableRLS();

// Relations
export const buildSessionRelations = relations(buildSessions, ({ one, many }) => ({
    user: one(users, {
        fields: [buildSessions.userId],
        references: [users.id],
    }),
    previewLinks: many(previewLinks),
}));

// Zod schemas
export const buildSessionInsertSchema = createInsertSchema(buildSessions, {
    language: z.enum(['en', 'es']).default('en'),
    inputType: z.enum(['idea', 'url']),
    inputValue: z.string().min(1),
});

export const buildSessionUpdateSchema = createUpdateSchema(buildSessions);

// Types
export type BuildSession = typeof buildSessions.$inferSelect;
export type NewBuildSession = typeof buildSessions.$inferInsert;

// Preview links table (imported for relations)
import { previewLinks } from './preview-link';
