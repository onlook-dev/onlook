import { initModel } from '@onlook/ai';
import { SUGGESTION_SYSTEM_PROMPT } from '@onlook/ai/src/prompt/suggest';
import {
    conversationInsertSchema,
    conversations,
    messageInsertSchema,
    messages,
    toConversation,
    toMessage,
    type Message,
} from '@onlook/db';
import type { ChatMessageRole, ChatSuggestion } from '@onlook/models';
import { LLMProvider, OPENROUTER_MODELS } from '@onlook/models';
import { ChatSuggestionsSchema } from '@onlook/models/chat';
import type { CoreMessage } from 'ai';
import { generateObject } from 'ai';
import { eq, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

const conversationRouter = createTRPCRouter({
    get: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            const dbConversations = await ctx.db.query.conversations.findMany({
                where: eq(conversations.projectId, input.projectId),
                orderBy: (conversations, { desc }) => [desc(conversations.updatedAt)],
            });
            return dbConversations.map((conversation) => toConversation(conversation));
        }),
    create: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .mutation(async ({ ctx, input }) => {
            const [conversation] = await ctx.db.insert(conversations).values({
                projectId: input.projectId,
            }).returning();
            if (!conversation) {
                throw new Error('Failed to create conversation');
            }
            return toConversation(conversation);
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
        .query(async ({ ctx, input }) => {
            const dbMessages = await ctx.db.query.messages.findMany({
                where: eq(messages.conversationId, input.conversationId),
                orderBy: (messages, { asc }) => [asc(messages.createdAt)],
            });
            return dbMessages.map((message) => toMessage(message));
        }),
    upsert: protectedProcedure
        .input(z.object({ message: messageInsertSchema }))
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

const suggestionsRouter = createTRPCRouter({
    generate: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
            messages: z.array(z.any()),
        }))
        .mutation(async ({ ctx, input }) => {
            const { model, headers } = await initModel({
                provider: LLMProvider.OPENROUTER,
                model: OPENROUTER_MODELS.OPEN_AI_GPT_4_1_NANO,
            });
            const { object } = await generateObject({
                model,
                headers,
                schema: ChatSuggestionsSchema,
                messages: [
                    {
                        role: 'system',
                        content: SUGGESTION_SYSTEM_PROMPT,
                    },
                    ...input.messages as CoreMessage[],
                    {
                        role: 'user',
                        content: 'Based on our conversation, what should I work on next to improve this page? Provide 3 specific, actionable suggestions.',
                    },
                ],
                maxTokens: 10000,
            });
            const suggestions = object.suggestions satisfies ChatSuggestion[];
            try {
                await ctx.db
                    .update(conversations)
                    .set({
                        suggestions,
                    }).where(eq(conversations.id, input.conversationId));
            } catch (error) {
                console.error('Error updating conversation suggestions:', error);
            }
            return suggestions;
        }),
});

export const chatRouter = createTRPCRouter({
    conversation: conversationRouter,
    message: messageRouter,
    suggestions: suggestionsRouter,
});
