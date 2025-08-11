import { mastra } from '@/mastra';
import { initModel } from '@onlook/ai';
import { SUGGESTION_SYSTEM_PROMPT } from '@onlook/ai/src/prompt/suggest';
import type { ChatSuggestion } from '@onlook/models';
import { LLMProvider, OPENROUTER_MODELS } from '@onlook/models';
import { ChatSuggestionsSchema } from '@onlook/models/chat';
import type { CoreMessage } from 'ai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const suggestionsRouter = createTRPCRouter({
    generate: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
            messages: z.array(z.any()),
        }))
        .mutation(async ({ ctx, input }) => {
            const { model, headers } = await initModel({
                provider: LLMProvider.OPENROUTER,
                model: OPENROUTER_MODELS.OPEN_AI_GPT_5_NANO,
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
