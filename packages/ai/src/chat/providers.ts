import { createAnthropic } from '@ai-sdk/anthropic';
import { CLAUDE_MODELS, LLMProvider } from '@onlook/models';
import { assertNever } from '@onlook/utility';
import { type LanguageModelV1 } from 'ai';

export async function initModel(
    provider: LLMProvider,
    model: CLAUDE_MODELS,
): Promise<LanguageModelV1> {
    switch (provider) {
        case LLMProvider.ANTHROPIC:
            return await getAnthropicProvider(model);
        default:
            assertNever(provider);
    }
}

async function getAnthropicProvider(model: CLAUDE_MODELS): Promise<LanguageModelV1> {
    const anthropic = createAnthropic();
    return anthropic(model, {
        cacheControl: true,
    });
}
