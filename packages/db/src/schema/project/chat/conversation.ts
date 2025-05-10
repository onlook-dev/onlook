import { relations } from "drizzle-orm";
import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { projects } from "../project";
import { CONVERSATION_MESSAGe_RELATION_NAME, messages } from "./message";

export const PROJECT_CONVERSATION_RELATION_NAME = "project_conversations";

export const conversations = pgTable("conversations", {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
    displayName: varchar("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

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