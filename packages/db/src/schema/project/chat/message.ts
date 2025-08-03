import type { MessageSnapshot } from "@onlook/models";
import { ChatMessageRole, type ChatMessageContext } from "@onlook/models";
import type { UIMessage } from "ai";
import { relations } from "drizzle-orm";
import { jsonb, pgEnum, pgTable, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { conversations } from "./conversation";

export const CONVERSATION_MESSAGe_RELATION_NAME = 'conversation_messages';
export const messageRole = pgEnum("role", ChatMessageRole);

export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
        .notNull()
        .references(() => conversations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    role: messageRole("role").notNull(),
    snapshots: jsonb("snapshots").$type<MessageSnapshot[]>().default([]).notNull(),
    context: jsonb("context").$type<ChatMessageContext[]>().default([]).notNull(),
    parts: jsonb("parts").$type<UIMessage['parts']>().default([]).notNull(),
}).enableRLS();

export const messageInsertSchema = createInsertSchema(messages);

export const messageRelations = relations(messages, ({ one }) => ({
    conversation: one(conversations, {
        fields: [messages.conversationId],
        references: [conversations.id],
        relationName: CONVERSATION_MESSAGe_RELATION_NAME,
    }),
}));

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
