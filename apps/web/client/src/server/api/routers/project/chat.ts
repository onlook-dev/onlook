import { mastra } from '@/mastra';
import { initModel } from '@onlook/ai';
import { SUGGESTION_SYSTEM_PROMPT } from '@onlook/ai/src/prompt/suggest';
import {
    toOnlookConversationFromMastra,
    toOnlookMessageFromMastra,
} from '@onlook/db';
import type { ChatSuggestion } from '@onlook/models';
import { LLMProvider, OPENROUTER_MODELS } from '@onlook/models';
import { ChatSuggestionsSchema } from '@onlook/models/chat';
import type { CoreMessage } from 'ai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

const conversationRouter = createTRPCRouter({
    getAll: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .query(async ({ ctx, input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            const threadsResult = await storage.getThreadsByResourceId({
                resourceId: input.projectId,
            })
            return threadsResult.map((thread) => toOnlookConversationFromMastra(thread));
        }),
    get: protectedProcedure
        .input(z.object({ conversationId: z.string() }))
        .query(async ({ input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            const thread = await storage.getThreadById({
                threadId: input.conversationId,
            })
            if (!thread) {
                throw new Error('Conversation not found');
            }
            return toOnlookConversationFromMastra(thread);
        }),
    create: protectedProcedure
        .input(z.object({ projectId: z.string() }))
        .mutation(async ({ input }) => {
            const { onlookAgent } = mastra.getAgents()
            const memory = await onlookAgent.getMemory()
            if (!memory) {
                throw new Error('Memory not found');
            }
            const thread = await memory.createThread({
                resourceId: input.projectId,
            });

            return toOnlookConversationFromMastra(thread);
        }),
    update: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
            title: z.string(),
            metadata: z.record(z.string(), z.any()),
        }))
        .mutation(async ({ input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            const thread = await storage.updateThread({
                id: input.conversationId,
                title: input.title,
                metadata: input.metadata,
            });

            return toOnlookConversationFromMastra(thread);
        }),
    delete: protectedProcedure
        .input(z.object({
            conversationId: z.string()
        }))
        .mutation(async ({ input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            await storage.deleteThread({
                threadId: input.conversationId,
            });
        }),
});

const messageRouter = createTRPCRouter({
    getAll: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
        }))
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
    update: protectedProcedure
        .input(z.object({
            messages: z.array(z.object({
                id: z.string(),
                content: z.object({
                    metadata: z.record(z.string(), z.any()),
                    parts: z.array(z.any()),
                }),
            })),
        }))
        .mutation(async ({ input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            const messages = await storage.updateMessages({
                messages: input.messages
            });
            return messages.map((message) => toOnlookMessageFromMastra(message));
        }),

    delete: protectedProcedure
        .input(z.object({
            messageIds: z.array(z.string()),
        }))
        .mutation(async ({ input }) => {
            const storage = mastra.getStorage()
            if (!storage) {
                throw new Error('Storage not found');
            }
            await storage.deleteMessages(input.messageIds);
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
                const storage = mastra.getStorage()
                if (!storage) {
                    throw new Error('Storage not found');
                }
                const thread = await storage.getThreadById({
                    threadId: input.conversationId,
                })
                if (!thread) {
                    throw new Error('Conversation not found');
                }
                await storage.updateThread({
                    id: thread.id,
                    title: thread.title ?? '',
                    metadata: {
                        ...thread.metadata,
                        suggestions,
                    },
                });
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
