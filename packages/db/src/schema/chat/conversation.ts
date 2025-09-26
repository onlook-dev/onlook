import { AgentType, type ChatSuggestion } from "@onlook/models";
import { relations } from "drizzle-orm";
import { jsonb, pgEnum, pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { z } from "zod";
import { projects } from "../project";
import { CONVERSATION_MESSAGe_RELATION_NAME, messages } from "./message";

export const PROJECT_CONVERSATION_RELATION_NAME = "project_conversations";

export const agentType = pgEnum("agent_type", AgentType);

export const conversations = pgTable("conversations", {
    id: uuid("id").primaryKey().defaultRandom(),
    agentType: agentType("agent_type").default(AgentType.ROOT),
    projectId: uuid("project_id")
        .notNull()
        .references(() => projects.id, { onDelete: "cascade", onUpdate: "cascade" }),
    displayName: varchar("display_name"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    suggestions: jsonb("suggestions").$type<ChatSuggestion[]>().default([]),
}).enableRLS();

export const conversationInsertSchema = createInsertSchema(conversations, {
    agentType: z.enum(AgentType).optional(),
});
export const conversationUpdateSchema = createUpdateSchema(conversations, {
    id: z.uuid(),
    agentType: z.enum(AgentType).optional(),
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