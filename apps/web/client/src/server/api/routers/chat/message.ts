import {
    conversations,
    fromDbMessage,
    messageInsertSchema,
    messages,
    messageUpdateSchema
} from '@onlook/db';
import { MessageCheckpointType } from '@onlook/models';
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
            return result.map((message) => fromDbMessage(message));
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
            }).where(eq(messages.id, input.messageId));
        }),
    updateCheckpoints: protectedProcedure
        .input(z.object({
            messageId: z.string(),
            checkpoints: z.array(z.object({
                type: z.enum(MessageCheckpointType),
                oid: z.string(),
                branchId: z.string(),
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

    // TODO: We're just doing a full replacement here which is inefficient.
    // To improve this, there's basically two use-cases we need to support:
    // 1) Add new messages (doesn't need to delete + reinsert messages)
    // 2) Edit a previous message (requires deleting all messages following the edited message and inserting new ones)
    // Tool calls are supported in both cases by the fact that they result in new messages being added.
    replaceConversationMessages: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
            messages: messageInsertSchema.array(),
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.transaction(async (tx) => {
                await tx.delete(messages).where(eq(messages.conversationId, input.conversationId));

                if (input.messages.length > 0) {
                    const normalizedMessages = input.messages.map(normalizeMessage);
                    await tx.insert(messages).values(normalizedMessages);
                }

                await tx.update(conversations).set({
                    updatedAt: new Date()
                }).where(eq(conversations.id, input.conversationId));
            });
        }),
})

const normalizeMessage = (message: z.infer<typeof messageInsertSchema>) => {
    return {
        ...message,
        createdAt: typeof message.createdAt === 'string' ? new Date(message.createdAt) : message.createdAt,
    };
};