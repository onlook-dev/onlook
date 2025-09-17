import { initModel } from '@onlook/ai';
import { SUGGESTION_SYSTEM_PROMPT } from '@onlook/ai/src/prompt/suggest';
import { conversations } from '@onlook/db';
import type { ChatSuggestion } from '@onlook/models';
import { LLMProvider, OPENROUTER_MODELS } from '@onlook/models';
import { ChatSuggestionsSchema } from '@onlook/models/chat';
import { convertToModelMessages, generateObject } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const suggestionsRouter = createTRPCRouter({
    generate: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
            messages: z.array(z.object({
                role: z.enum(['user', 'assistant', 'system']),
                content: z.string(),
            })),
        }))
        .mutation(async ({ ctx, input }) => {
            const { model, headers } = await initModel({
                provider: LLMProvider.OPENROUTER,
                model: OPENROUTER_MODELS.OPEN_AI_GPT_5_NANO,
            });


            console.log('[START] - generating suggestions');
            console.log(input.messages)
            const { object } = await generateObject({
                model,
                headers,
                schema: ChatSuggestionsSchema,
                messages: [
                    {
                        role: 'system',
                        content: SUGGESTION_SYSTEM_PROMPT,
                    },
                    ...convertToModelMessages(input.messages.map((m) => ({
                        role: m.role,
                        parts: [{ type: 'text', text: m.content }],
                    }))),
                    {
                        role: 'user',
                        content: 'Based on our conversation, what should I work on next to improve this page? Provide 3 specific, actionable suggestions. These should be realistic and achievable. Return the suggestions as a JSON object. DO NOT include any other text.',
                    },
                ],
                maxOutputTokens: 10000,
            });
            console.log('[GENERATED] - generating suggestions');

            const suggestions = object.suggestions satisfies ChatSuggestion[];
            try {
                await ctx.db.update(conversations).set({
                    suggestions,
                }).where(eq(conversations.id, input.conversationId));
                console.log('[UPDATED] - generating suggestions');

            } catch (error) {
                console.error('Error updating conversation suggestions:', error);
            }
            console.log('[DONE] - generating suggestions');

            return suggestions;
        }),
});
