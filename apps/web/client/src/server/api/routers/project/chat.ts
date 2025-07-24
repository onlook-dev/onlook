import { mastra } from '@/mastra';
import {
    conversationInsertSchema,
    conversations,
    messageInsertSchema,
    messages,
    toOnlookConversationFromMastra,
    toOnlookMessageFromMastra,
    type Message
} from '@onlook/db';
import type { ChatMessageRole } from '@onlook/models';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

const conversationRouter = createTRPCRouter({
    get: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {

            const storage = mastra.getStorage()

            if (!storage) {
                throw new Error('Storage not found');
            }

            const threadsResult = await storage.getThreadsByResourceIdPaginated({
                page: 0,
                perPage: 1000,
                resourceId: input.projectId,
            })

            return threadsResult.threads.map((thread) => toOnlookConversationFromMastra(thread));
        }),
    create: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const memory = mastra.getMemory()

            if (!memory) {
                throw new Error('Storage not found');
            }

            const thread = await memory.createThread(
                {
                    resourceId: input.projectId,
                },
            );

            return toOnlookConversationFromMastra(thread);
        }),
    upsert: protectedProcedure
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
    delete: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.db
                .delete(conversations)
                .where(eq(conversations.id, input.conversationId));
        }),
});

const messageRouter = createTRPCRouter({
    get: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .query(async ({ input }) => {
            const storage = mastra.getStorage()

            if (!storage) {
                throw new Error('Storage not found');
            }

            const messagesResult = await storage.getMessages({
                threadId: input.conversationId,
                format: 'v2',
            })
            return messagesResult.map((message) => toOnlookMessageFromMastra(message));
        }),
    upsert: protectedProcedure
        .input(z.object({ message: messageInsertSchema }))
        .mutation(async ({ ctx, input }) => {
            // TODO: Update mastra threads
            const conversationId = input.message.conversationId;
            if (conversationId) {
                const conversation = await ctx.db.query.conversations.findFirst({
                    where: eq(conversations.id, conversationId),
                });
                if (!conversation) {
                    throw new Error(`Conversation not found`);
                }
            }

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
    delete: protectedProcedure
        .input(z.object({ messageIds: z.array(z.string()) }))
        .mutation(async ({ ctx, input }) => {
            return await ctx.db.delete(messages).where(inArray(messages.id, input.messageIds));
        }),
})

export const chatRouter = createTRPCRouter({
    conversation: conversationRouter,
    message: messageRouter,
});
