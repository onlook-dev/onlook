import type { ChatMessage } from "@onlook/models";
import { type MessageCheckpoints, type MessageContext } from "@onlook/models";
import type { LanguageModelUsage } from 'ai';
import { relations } from "drizzle-orm";
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { conversations } from "./conversation";

export const CONVERSATION_MESSAGe_RELATION_NAME = 'conversation_messages';
export const messageRole = pgEnum("message_role", ['user', 'assistant', 'system']);

export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
        .notNull()
        .references(() => conversations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    role: messageRole("role").notNull(),
    context: jsonb("context").$type<MessageContext[]>().default([]).notNull(),
    parts: jsonb("parts").$type<ChatMessage['parts']>().default([]).notNull(),
    checkpoints: jsonb("checkpoints").$type<MessageCheckpoints[]>().default([]).notNull(),
    usage: jsonb("usage").$type<LanguageModelUsage>(),

    // deprecated
    applied: boolean("applied"),
    commitOid: text("commit_oid"),
    snapshots: jsonb("snapshots").$type<any>(),
}).enableRLS();

export const messageInsertSchema = createInsertSchema(messages);
export const messageUpdateSchema = createUpdateSchema(messages);

export const messageRelations = relations(messages, ({ one }) => ({
    conversation: one(conversations, {
        fields: [messages.conversationId],
        references: [conversations.id],
        relationName: CONVERSATION_MESSAGe_RELATION_NAME,
    }),
}));

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
