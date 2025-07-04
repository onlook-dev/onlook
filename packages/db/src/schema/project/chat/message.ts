import { ChatMessageRole, type ChatMessageContext, type ChatSnapshot } from "@onlook/models";
import type { Message as AiMessage } from "ai";
import { relations } from "drizzle-orm";
import { boolean, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { conversations } from "./conversation";

export const CONVERSATION_MESSAGe_RELATION_NAME = 'conversation_messages';
export const messageRole = pgEnum("role", ChatMessageRole);

export const messages = pgTable("messages", {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
        .notNull()
        .references(() => conversations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    role: messageRole("role").notNull(),
    applied: boolean("applied").default(false).notNull(),
    snapshots: jsonb("snapshots").$type<ChatSnapshot>().default({}).notNull(),
    context: jsonb("context").$type<ChatMessageContext[]>().default([]).notNull(),
    parts: jsonb("parts").$type<AiMessage['parts']>().default([]).notNull(),
    commitOid: text("commit_oid"),
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
