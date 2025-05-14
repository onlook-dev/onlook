import {
    conversationInsertSchema,
    conversations,
    messageInsertSchema,
    messages,
    toConversation,
    type Message,
} from '@onlook/db';
import type { ChatMessageRole } from '@onlook/models';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';

export const chatRouter = createTRPCRouter({
    getConversation: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            const dbConversations = await ctx.db.query.conversations.findMany({
                where: eq(conversations.projectId, input.projectId),
                with: {
                    messages: true,
                },
            });
            return dbConversations.map((conversation) =>
                toConversation(conversation, conversation.messages),
            );
        }),
    saveConversation: protectedProcedure
        .input(z.object({ conversation: conversationInsertSchema }))
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.db
                    .insert(conversations)
                    .values(input.conversation)
                    .onConflictDoUpdate({
                        target: [conversations.id],
                        set: {
                            ...input.conversation,
                        },
                    });
                return true;
            } catch (error) {
                console.error('Error saving conversation', error);
                return false;
            }
        }),
    deleteConversation: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.db
                    .delete(conversations)
                    .where(eq(conversations.id, input.conversationId));
                return true;
            } catch (error) {
                console.error('Error deleting conversation', error);
                return false;
            }
        }),
    saveMessage: protectedProcedure
        .input(z.object({ message: messageInsertSchema }))
        .mutation(async ({ ctx, input }) => {
            try {
                const normalizedMessage = {
                    ...input.message,
                    role: input.message.role as ChatMessageRole,
                    parts: input.message.parts as Message['parts'],
                };
                await ctx.db
                    .insert(messages)
                    .values(normalizedMessage)
                    .onConflictDoUpdate({
                        target: [messages.id],
                        set: {
                            ...normalizedMessage,
                        },
                    });
                return true;
            } catch (error) {
                console.error('Error saving message', error);
                return false;
            }
        }),
    deleteMessages: protectedProcedure
        .input(z.object({ messageIds: z.array(z.string()) }))
        .mutation(async ({ ctx, input }) => {
            try {
                await ctx.db.delete(messages).where(inArray(messages.id, input.messageIds));
                return true;
            } catch (error) {
                console.error('Error deleting messages', error);
                return false;
            }
        }),
});
