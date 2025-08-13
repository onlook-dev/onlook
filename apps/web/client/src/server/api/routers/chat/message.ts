import {
    conversations,
    messageInsertSchema,
    messages,
    messageUpdateSchema,
    toMessage,
    type Message
} from '@onlook/db';
import { MessageCheckpointType, type ChatMessageRole } from '@onlook/models';
import { asc, eq, inArray } from 'drizzle-orm';
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
                orderBy: [asc(messages.createdAt)],
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
            await ctx.db.insert(messages).values(normalizedMessages);
        }),
    update: protectedProcedure
        .input(z.object({
            messageId: z.string(),
            message: messageUpdateSchema
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.update(messages).set({
                ...input.message,
                role: input.message.role as ChatMessageRole,
                parts: input.message.parts as Message['parts'],
            }).where(eq(messages.id, input.messageId));
        }),
    updateCheckpoints: protectedProcedure
        .input(z.object({
            messageId: z.string(),
            checkpoints: z.array(z.object({
                type: z.nativeEnum(MessageCheckpointType),
                oid: z.string(),
                createdAt: z.date(),
            })),
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.update(messages).set({
                checkpoints: input.checkpoints,
            }).where(eq(messages.id, input.messageId));
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