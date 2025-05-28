import {
    conversationInsertSchema,
    conversations,
    messageInsertSchema,
    messages,
    toConversation,
    toMessage,
    type Message,
} from '@onlook/db';
import type { ChatMessageRole } from '@onlook/models';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const chatRouter = createTRPCRouter({
    getConversations: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            const dbConversations = await ctx.db.query.conversations.findMany({
                where: eq(conversations.projectId, input.projectId),
                orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
            });
            return dbConversations.map((conversation) => toConversation(conversation));
        }),
    saveConversation: protectedProcedure
        .input(z.object({ conversation: conversationInsertSchema }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.db
                .insert(conversations)
                .values(input.conversation)
                .onConflictDoUpdate({
                    target: [conversations.id],
                    set: {
                        ...input.conversation,
                    },
                });
        }),
    deleteConversation: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.db
                .delete(conversations)
                .where(eq(conversations.id, input.conversationId));
        }),
    getMessages: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .query(async ({ ctx, input }) => {
            const dbMessages = await ctx.db.query.messages.findMany({
                where: eq(messages.conversationId, input.conversationId),
                orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            });
            return dbMessages.map((message) => toMessage(message));
        }),
    saveMessage: protectedProcedure
        .input(z.object({ message: messageInsertSchema }))
        .mutation(async ({ ctx, input }) => {
            const normalizedMessage = {
                ...input.message,
                role: input.message.role as ChatMessageRole,
                parts: input.message.parts as Message['parts'],
            };
            return await ctx.db
                .insert(messages)
                .values(normalizedMessage)
                .onConflictDoUpdate({
                    target: [messages.id],
                    set: {
                        ...normalizedMessage,
                    },
                });

        }),
    deleteMessages: protectedProcedure
        .input(z.object({ messageIds: z.array(z.string()) }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.db.delete(messages).where(inArray(messages.id, input.messageIds));
        }),
});
