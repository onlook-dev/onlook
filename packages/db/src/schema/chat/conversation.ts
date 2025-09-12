import type { ChatSuggestion } from "@onlook/models";
import { relations } from "drizzle-orm";
import { index, jsonb, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
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
    suggestions: jsonb("suggestions").$type<ChatSuggestion[]>().default([]),
    
    // Subchat support: points to a parent conversation if this is a subchat
    parentConversationId: uuid("parent_conversation_id"),
    
    // Optional: which message spawned this subchat
    parentMessageId: uuid("parent_message_id"),
}, (table) => ({
    // Indexes for efficient subchat queries
    parentConversationIdx: index("conversations_parent_conversation_idx").on(table.parentConversationId),
    parentMessageIdx: index("conversations_parent_message_idx").on(table.parentMessageId),
    projectIdIdx: index("conversations_project_id_idx").on(table.projectId),
})).enableRLS();

export const conversationInsertSchema = createInsertSchema(conversations);
export const conversationUpdateSchema = createUpdateSchema(conversations, {
    id: z.string().uuid(),
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
    
    // Parent relationship
    parentConversation: one(conversations, {
        fields: [conversations.parentConversationId],
        references: [conversations.id],
        relationName: "conversation_parent",
    }),
    
    // Child relationships (subchats)
    subchats: many(conversations, {
        relationName: "conversation_parent",
    }),
    
    // Parent message that spawned this subchat
    parentMessage: one(messages, {
        fields: [conversations.parentMessageId],
        references: [messages.id],
        relationName: "conversation_spawned_from_message",
    }),
}));

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;