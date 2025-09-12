import { ChatMessageRole, type MessageCheckpoints, type MessageContext } from "@onlook/models";
import type { UIMessage } from "ai";
import { relations } from "drizzle-orm";
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { conversations } from "./conversation";
import { parts } from "./parts";

export const CONVERSATION_MESSAGe_RELATION_NAME = 'conversation_messages';
export const messageRole = pgEnum("message_role", ['user', 'assistant', 'system']);

export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
        .notNull()
        .references(() => conversations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    role: messageRole("role").notNull(),
    context: jsonb("context").$type<MessageContext[]>().default([]).notNull(),
    checkpoints: jsonb("checkpoints").$type<MessageCheckpoints[]>().default([]).notNull(),

    // deprecated - will be removed in future migration
    applied: boolean("applied"),
    commitOid: text("commit_oid"),
    snapshots: jsonb("snapshots").$type<any>(),
    parts: jsonb("parts").$type<UIMessage['parts']>().default([]).notNull(),
    content: text("content"),
}).enableRLS();

export const messageInsertSchema = createInsertSchema(messages);
export const messageUpdateSchema = createUpdateSchema(messages);

export const messageRelations = relations(messages, ({ one, many }) => ({
    conversation: one(conversations, {
        fields: [messages.conversationId],
        references: [conversations.id],
        relationName: CONVERSATION_MESSAGe_RELATION_NAME,
    }),

    // Message parts (replaces JSONB parts column)
    parts: many(parts, {
        relationName: "message_parts",
    }),

    // Subchats spawned from this message
    spawnedSubchats: many(conversations, {
        relationName: "conversation_spawned_from_message",
    }),
}));

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
