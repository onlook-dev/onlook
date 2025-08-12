import {
    conversations,
    messageInsertSchema,
    messages,
    toMessage,
    type Message
} from '@onlook/db';
import type { ChatMessageRole } from '@onlook/models';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const messageRouter = createTRPCRouter({
    getAll: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
        }))
        .query(async ({ ctx, input }) => {
            const result = await ctx.db.query.messages.findMany({
                where: eq(messages.conversationId, input.conversationId),
            });
            return result.map((message) => toMessage(message));
        }),
    upsert: protectedProcedure
        .input(z.object({
            message: messageInsertSchema
        }))
        .mutation(async ({ ctx, input }) => {
            const conversationId = input.message.conversationId;
            if (conversationId) {
                const conversation = await ctx.db.query.conversations.findFirst({
                    where: eq(conversations.id, conversationId),
                });
                if (!conversation) {
                    throw new Error(`Conversation not found`);
                }
            }
            const normalizedMessage = normalizeMessage(input.message);
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
    upsertMany: protectedProcedure
        .input(z.object({
            messages: messageInsertSchema.array(),
        }))
        .mutation(async ({ ctx, input }) => {
            const normalizedMessages = input.messages.map(normalizeMessage);
            console.log('normalizedMessages', JSON.stringify(normalizedMessages, null, 2));
            await ctx.db.insert(messages).values(normalizedMessages);
        }),
    delete: protectedProcedure
        .input(z.object({
            messageIds: z.array(z.string()),
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.delete(messages).where(inArray(messages.id, input.messageIds));
        }),
})

const normalizeMessage = (message: z.infer<typeof messageInsertSchema>) => {
    return {
        ...message,
        role: message.role as ChatMessageRole,
        parts: message.parts as Message['parts'],
        createdAt: typeof message.createdAt === 'string' ? new Date(message.createdAt) : message.createdAt,
    };
};