import { relations } from 'drizzle-orm';
import { pgTable, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { authUsers } from '../supabase/user';
import { userSettings } from './settings';
import { userProjects } from './user-project';

export const users = pgTable("users", {
    id: uuid("id")
        .primaryKey()
        .references(() => authUsers.id, { onDelete: "cascade", onUpdate: "cascade" }),
}).enableRLS();

export const usersRelations = relations(users, ({ many, one }) => ({
    userProjects: many(userProjects),
    userSettings: one(userSettings),
}));

export const userInsertSchema = createInsertSchema(users);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
