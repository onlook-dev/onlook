import { ChatMessageRole, type MessageCheckpoints, type MessageContext } from "@onlook/models";
import type { UIMessage as AiMessage } from "ai";
import { relations } from "drizzle-orm";
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";
import { conversations } from "./conversation";

export const CONVERSATION_MESSAGe_RELATION_NAME = 'conversation_messages';
export const messageRole = pgEnum("message_role", ChatMessageRole);

export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
        .notNull()
        .references((): AnyPgColumn => conversations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    role: messageRole("role").notNull(),
    context: jsonb("context").$type<MessageContext[]>().default([]).notNull(),
    checkpoints: jsonb("checkpoints").$type<MessageCheckpoints[]>().default([]).notNull(),

    // deprecated
    applied: boolean("applied"),
    commitOid: text("commit_oid"),
    snapshots: jsonb("snapshots").$type<any>(),
    parts: jsonb("parts").$type<AiMessage['parts']>().default([]),
    content: text("content"),
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
