import {
    conversations,
    conversationUpdateSchema,
    toConversation
} from '@onlook/db';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const conversationRouter = createTRPCRouter({
    getAll: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            const dbConversations = await ctx.db.query.conversations.findMany({
                where: eq(conversations.projectId, input.projectId),
                orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
            });
            return dbConversations.map((conversation) => toConversation(conversation));
        }),
    get: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .query(async ({ ctx, input }) => {
            const conversation = await ctx.db.query.conversations.findFirst({
                where: eq(conversations.id, input.conversationId),
            });
            if (!conversation) {
                throw new Error('Conversation not found');
            }
            return toConversation(conversation);
        }),
    upsert: protectedProcedure
        .input(z.object({ projectId: z.string(), title: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const [conversation] = await ctx.db.insert(conversations).values({
                projectId: input.projectId,
                displayName: input.title,
            }).returning();
            if (!conversation) {
                throw new Error('Conversation not created');
            }
            return toConversation(conversation);
        }),
    update: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
            conversation: conversationUpdateSchema,
        }))
        .mutation(async ({ ctx, input }) => {
            const [conversation] = await ctx.db.update({
                ...conversations,
                updatedAt: new Date(),
            }).set(input.conversation)
                .where(eq(conversations.id, input.conversationId)).returning();
            if (!conversation) {
                throw new Error('Conversation not updated');
            }
            return toConversation(conversation);
        }),
    delete: protectedProcedure
        .input(z.object({
            conversationId: z.string()
        }))
        .mutation(async ({ ctx, input }) => {
            await ctx.db.delete(conversations).where(eq(conversations.id, input.conversationId));
        }),
});
