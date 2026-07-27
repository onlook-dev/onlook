import {
    LLMProvider,
    MINIMAX_MODELS,
    MODEL_MAX_TOKENS,
    OPENROUTER_MODELS,
    type InitialModelPayload,
    type ModelConfig
} from '@onlook/models';
import { assertNever } from '@onlook/utility';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import type { LanguageModel } from 'ai';

export function initModel({
    provider: requestedProvider,
    model: requestedModel,
}: InitialModelPayload): ModelConfig {
    let model: LanguageModel;
    let providerOptions: Record<string, any> | undefined;
    let headers: Record<string, string> | undefined;
    let maxOutputTokens: number = MODEL_MAX_TOKENS[requestedModel];

    switch (requestedProvider) {
        case LLMProvider.OPENROUTER:
            model = getOpenRouterProvider(requestedModel);
            headers = {
                'HTTP-Referer': 'https://onlook.com',
                'X-Title': 'Onlook',
            };
            providerOptions = {
                openrouter: { transforms: ['middle-out'] },
            };
            const isAnthropic = requestedModel === OPENROUTER_MODELS.CLAUDE_4_5_SONNET || requestedModel === OPENROUTER_MODELS.CLAUDE_3_5_HAIKU;
            providerOptions = isAnthropic
                ? { ...providerOptions, anthropic: { cacheControl: { type: 'ephemeral' } } }
                : providerOptions;
            break;
        case LLMProvider.MINIMAX:
            model = getMinimaxProvider(requestedModel);
            break;
        default:
            assertNever(requestedProvider);
    }

    return {
        model,
        providerOptions,
        headers,
        maxOutputTokens,
    };
}

function getOpenRouterProvider(model: OPENROUTER_MODELS): LanguageModel {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY must be set');
    }
    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
    return openrouter(model);
}

function getMinimaxProvider(model: MINIMAX_MODELS): LanguageModel {
    if (!process.env.MINIMAX_API_KEY) {
        throw new Error('MINIMAX_API_KEY must be set');
    }
    const minimax = createOpenAICompatible({
        name: 'minimax',
        baseURL: 'https://api.minimax.io/v1',
        apiKey: process.env.MINIMAX_API_KEY,
    });
    return minimax(model);
}
