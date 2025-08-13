import { initModel } from '@onlook/ai';
import { SUGGESTION_SYSTEM_PROMPT } from '@onlook/ai/src/prompt/suggest';
import { conversations } from '@onlook/db';
import type { ChatSuggestion } from '@onlook/models';
import { LLMProvider, OPENROUTER_MODELS } from '@onlook/models';
import { ChatMessageRole, ChatSuggestionsSchema } from '@onlook/models/chat';
import { generateObject } from 'ai';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../../trpc';

export const suggestionsRouter = createTRPCRouter({
    generate: protectedProcedure
        .input(z.object({
            conversationId: z.string(),
            messages: z.array(z.object({
                role: z.string(),
                content: z.string(),
            })),
        }))
        .mutation(async ({ ctx, input }) => {
            const { model, headers } = await initModel({
                provider: LLMProvider.OPENROUTER,
                model: OPENROUTER_MODELS.CLAUDE_4_SONNET,
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
                    ...input.messages.map((m) => ({
                        role: m.role as ChatMessageRole,
                        content: m.content,
                    })),
                    {
                        role: 'user',
                        content: 'Based on our conversation, what should I work on next to improve this page? Provide 3 specific, actionable suggestions.',
                    },
                ],
                maxTokens: 10000,
            });
            const suggestions = object.suggestions satisfies ChatSuggestion[];
            try {
                await ctx.db.update(conversations).set({
                    suggestions,
                }).where(eq(conversations.id, input.conversationId));
            } catch (error) {
                console.error('Error updating conversation suggestions:', error);
            }
            return suggestions;
        }),
});
