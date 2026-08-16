import type { LanguageModel } from 'ai';

export enum LLMProvider {
    OPENROUTER = 'openrouter',
    TRUSTEDROUTER = 'trustedrouter',
}

export enum OPENROUTER_MODELS {
    // Generate object does not work for Anthropic models https://github.com/OpenRouterTeam/ai-sdk-provider/issues/165
    CLAUDE_4_5_SONNET = 'anthropic/claude-sonnet-4.5',
    CLAUDE_3_5_HAIKU = 'anthropic/claude-3.5-haiku',
    OPEN_AI_GPT_5 = 'openai/gpt-5',
    OPEN_AI_GPT_5_MINI = 'openai/gpt-5-mini',
    OPEN_AI_GPT_5_NANO = 'openai/gpt-5-nano',
}

// TrustedRouter model ids are namespaced; a bare id is rejected. Ids under
// `trustedrouter/` are routing policies rather than single models: each picks an
// upstream per request and fails over.
export enum TRUSTEDROUTER_MODELS {
    AUTO = 'trustedrouter/auto',
    ZDR = 'trustedrouter/zdr',
    CLAUDE_4_6_SONNET = 'anthropic/claude-sonnet-4-6',
    OPEN_AI_GPT_5_4_MINI = 'openai/gpt-5.4-mini',
}

interface ModelMapping {
    [LLMProvider.OPENROUTER]: OPENROUTER_MODELS;
    [LLMProvider.TRUSTEDROUTER]: TRUSTEDROUTER_MODELS;
}

export type InitialModelPayload = {
    [K in keyof ModelMapping]: {
        provider: K;
        model: ModelMapping[K];
    };
}[keyof ModelMapping];

export type ModelConfig = {
    model: LanguageModel;
    providerOptions?: Record<string, any>;
    headers?: Record<string, string>;
    maxOutputTokens: number;
};

export const MODEL_MAX_TOKENS = {
    [OPENROUTER_MODELS.CLAUDE_4_5_SONNET]: 200000,
    [OPENROUTER_MODELS.CLAUDE_3_5_HAIKU]: 200000,
    [OPENROUTER_MODELS.OPEN_AI_GPT_5_NANO]: 400000,
    [OPENROUTER_MODELS.OPEN_AI_GPT_5_MINI]: 400000,
    [OPENROUTER_MODELS.OPEN_AI_GPT_5]: 400000,
    [TRUSTEDROUTER_MODELS.AUTO]: 200000,
    [TRUSTEDROUTER_MODELS.ZDR]: 200000,
    [TRUSTEDROUTER_MODELS.CLAUDE_4_6_SONNET]: 1000000,
    [TRUSTEDROUTER_MODELS.OPEN_AI_GPT_5_4_MINI]: 400000,
} as const;
