import { relations, sql } from "drizzle-orm";
import { pgPolicy, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { projects } from "../project";
import { CONVERSATION_MESSAGe_RELATION_NAME, messages } from "./message";

export const PROJECT_CONVERSATION_RELATION_NAME = "project_conversations";

export const conversations = pgTable("conversations", {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id")
        .notNull()
        .references(() => projects.id, { onDelete: "cascade", onUpdate: "cascade" }),
    displayName: varchar("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => {
    return {
        viewPolicy: pgPolicy("Users can view their own conversations", {
            for: "select",
            to: "authenticated",
            using: sql`project_id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid())`
        }),
        createPolicy: pgPolicy("Users can create conversations for their own projects", {
            for: "insert",
            to: "authenticated",
            using: sql`project_id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid())`
        }),
        updatePolicy: pgPolicy("Users can update their own conversations", {
            for: "update",
            to: "authenticated",
            using: sql`project_id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid())`
        }),
        deletePolicy: pgPolicy("Users can delete their own conversations", {
            for: "delete",
            to: "authenticated",
            using: sql`project_id IN (SELECT project_id FROM user_projects WHERE user_id = auth.uid())`
        })
    };
}).enableRLS();

export const conversationInsertSchema = createInsertSchema(conversations);

export const conversationRelations = relations(conversations, ({ one, many }) => ({
    project: one(projects, {
        fields: [conversations.projectId],
        references: [projects.id],
        relationName: PROJECT_CONVERSATION_RELATION_NAME,
    }),
    messages: many(messages, {
        relationName: CONVERSATION_MESSAGe_RELATION_NAME,
    }),
}));

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
