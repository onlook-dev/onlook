import { relations, sql } from 'drizzle-orm';
import { pgPolicy, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { userProjects } from '../user';
import { canvases } from './canvas';
import { conversations, PROJECT_CONVERSATION_RELATION_NAME } from './chat/conversation';

export const projects = pgTable("projects", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name").notNull(),
    sandboxId: varchar("sandbox_id").notNull(),
    sandboxUrl: varchar("sandbox_url").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    previewImg: varchar("preview_img"),
    description: text("description"),
}, (table) => {
    return {
        viewPolicy: pgPolicy("Users can view their own projects", {
            for: "select",
            to: "authenticated",
            using: sql`id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid())`
        }),
        createPolicy: pgPolicy("Users can create their own projects", {
            for: "insert",
            to: "authenticated",
            using: sql`true` // The association with user is handled in the userProjects table
        }),
        updatePolicy: pgPolicy("Users can update their own projects", {
            for: "update",
            to: "authenticated",
            using: sql`id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid())`
        }),
        deletePolicy: pgPolicy("Users can delete their own projects", {
            for: "delete",
            to: "authenticated",
            using: sql`id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid())`
        })
    };
}).enableRLS();

export const projectInsertSchema = createInsertSchema(projects);

export const projectRelations = relations(projects, ({ one, many }) => ({
    canvas: one(canvases, {
        fields: [projects.id],
        references: [canvases.projectId],
    }),
    userProjects: many(userProjects),
    conversations: many(conversations, {
        relationName: PROJECT_CONVERSATION_RELATION_NAME,
    }),
}));

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
