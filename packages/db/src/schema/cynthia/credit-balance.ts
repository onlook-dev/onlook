import { pgEnum, pgTable, uuid, text, integer, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';
import { z } from 'zod';
import { users } from '../user';

// Cynthia plan enum
export const cynthiaPlan = pgEnum('cynthia_plan', [
    'free',
    'starter',
    'pro',
    'agency',
]);

// Credit balances table for Cynthia Build My Site
export const creditBalances = pgTable('credit_balances', {
    id: uuid('id').primaryKey().defaultRandom(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

    // User relationship
    userId: uuid('user_id')
        .notNull()
        .unique() // One credit balance per user
        .references(() => users.id, {
            onDelete: 'cascade',
            onUpdate: 'cascade',
        }),

    // Plan and credits
    plan: cynthiaPlan('plan').notNull().default('free'),
    monthlyCredits: integer('monthly_credits').notNull().default(0),
    usedCredits: integer('used_credits').notNull().default(0),

    // Reset tracking
    resetAt: timestamp('reset_at', { withTimezone: true }).notNull(),
}).enableRLS();

// Relations
export const creditBalanceRelations = relations(creditBalances, ({ one }) => ({
    user: one(users, {
        fields: [creditBalances.userId],
        references: [users.id],
    }),
}));

// Zod schemas
export const creditBalanceInsertSchema = createInsertSchema(creditBalances, {
    plan: z.enum(['free', 'starter', 'pro', 'agency']),
    monthlyCredits: z.number().int().min(0),
    usedCredits: z.number().int().min(0),
});

export const creditBalanceUpdateSchema = createUpdateSchema(creditBalances);

// Types
export type CreditBalance = typeof creditBalances.$inferSelect;
export type NewCreditBalance = typeof creditBalances.$inferInsert;

// Plan credit mappings (authoritative)
export const CYNTHIA_PLAN_CREDITS: Record<string, number> = {
    free: 0,
    starter: 10,
    pro: 50,
    agency: 200,
};
