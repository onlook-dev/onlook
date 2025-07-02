import { relations } from 'drizzle-orm';
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { usageRecords } from '../subscription';
import { subscriptions } from '../subscription/subscription';
import { authUsers } from '../supabase';
import { userSettings } from './settings';
import { userCanvases } from './user-canvas';
import { userProjects } from './user-project';

export const users = pgTable('users', {
    id: uuid('id')
        .primaryKey()
        .references(() => authUsers.id, { onDelete: 'cascade', onUpdate: 'cascade' }),
    name: text('name'),
    avatarUrl: text('avatar_url'),
    email: text('email'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
}).enableRLS();

export const usersRelations = relations(users, ({ many, one }) => ({
    userCanvases: many(userCanvases),
    userProjects: many(userProjects),
    userSettings: one(userSettings),
    authUser: one(authUsers),
    subscriptions: many(subscriptions),
    usageRecords: many(usageRecords),
}));

export const userInsertSchema = createInsertSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
