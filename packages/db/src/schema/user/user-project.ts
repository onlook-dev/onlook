import { relations, sql } from 'drizzle-orm';
import { pgPolicy, pgTable, primaryKey, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { projects } from '../project';
import { users } from './user';

export const userProjects = pgTable("user_projects", {
    userId: uuid("user_id")
        .notNull()
        .references(() => users.id, { onDelete: "cascade", onUpdate: "cascade" }),
    projectId: uuid("project_id")
        .notNull()
        .references(() => projects.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => {
    const pk = primaryKey({ columns: [table.userId, table.projectId] });
    return {
        pk,
        viewPolicy: pgPolicy("Users can view their own user_projects entries", {
            for: "select",
            to: "authenticated",
            using: sql`user_id = auth.uid()`
        }),
        createPolicy: pgPolicy("Users can create their own user_projects entries", {
            for: "insert",
            to: "authenticated",
            using: sql`user_id = auth.uid()`
        }),
        deletePolicy: pgPolicy("Users can delete their own user_projects entries", {
            for: "delete",
            to: "authenticated",
            using: sql`user_id = auth.uid()`
        })
    };
}).enableRLS();

export const userProjectsRelations = relations(userProjects, ({ one }) => ({
    user: one(users, {
        fields: [userProjects.userId],
        references: [users.id],
    }),
    project: one(projects, {
        fields: [userProjects.projectId],
        references: [projects.id],
    }),
}));

export const userProjectInsertSchema = createInsertSchema(userProjects);
export type UserProject = typeof userProjects.$inferSelect;
export type NewUserProject = typeof userProjects.$inferInsert;  