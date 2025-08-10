import { createAnthropic } from '@ai-sdk/anthropic';
import {
    ANTHROPIC_MODELS,
    LLMProvider,
    MODEL_MAX_TOKENS,
    OPENROUTER_MODELS,
    type InitialModelPayload,
    type ModelConfig,
} from '@onlook/models';
import { assertNever } from '@onlook/utility';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { type LanguageModelV1 } from 'ai';

export async function initModel({
    provider: requestedProvider,
    model: requestedModel,
}: InitialModelPayload): Promise<ModelConfig> {
    let model: LanguageModelV1;
    let providerOptions: Record<string, any> | undefined;
    let headers: Record<string, string> | undefined;
    let maxTokens: number = MODEL_MAX_TOKENS[requestedModel];

    switch (requestedProvider) {
        case LLMProvider.ANTHROPIC:
            model = await getAnthropicProvider(requestedModel);
            break;
        case LLMProvider.OPENROUTER:
            model = await getOpenRouterProvider(requestedModel);
            headers = {
                'HTTP-Referer': 'https://onlook.com',
                'X-Title': 'Onlook',
            };
            providerOptions = {
                openrouter: { transforms: ['middle-out'] },
            };
            const isClaude =
                requestedModel === OPENROUTER_MODELS.CLAUDE_4_SONNET ||
                requestedModel === OPENROUTER_MODELS.OPEN_AI_GPT_5_NANO;
            providerOptions = isClaude
                ? { ...providerOptions, anthropic: { cacheControl: { type: 'ephemeral' } } }
                : providerOptions;
            break;
        default:
            assertNever(requestedProvider);
    }

    return {
        model,
        providerOptions,
        headers,
        maxTokens,
    };
}

async function getAnthropicProvider(model: ANTHROPIC_MODELS): Promise<LanguageModelV1> {
    const anthropic = createAnthropic();
    return anthropic(model, {
        cacheControl: true,
    });
}

async function getOpenRouterProvider(model: OPENROUTER_MODELS): Promise<LanguageModelV1> {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY must be set');
    }
    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
    return openrouter(model);
}
