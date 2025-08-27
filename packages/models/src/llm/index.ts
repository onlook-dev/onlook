import type { LanguageModel } from 'ai';

export enum LLMProvider {
    ANTHROPIC = 'anthropic',
    OPENROUTER = 'openrouter',
}

export enum ANTHROPIC_MODELS {
    SONNET_4 = 'claude-sonnet-4-20250514',
    HAIKU = 'claude-3-5-haiku-20241022',
}

export enum OPENROUTER_MODELS {
    CLAUDE_4_SONNET = 'anthropic/claude-sonnet-4',
    OPEN_AI_GPT_5 = 'openai/gpt-5',
    OPEN_AI_GPT_5_MINI = 'openai/gpt-5-mini',
    OPEN_AI_GPT_5_NANO = 'openai/gpt-5-nano',
}

interface ModelMapping {
    [LLMProvider.ANTHROPIC]: ANTHROPIC_MODELS;
    [LLMProvider.OPENROUTER]: OPENROUTER_MODELS;
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
    [OPENROUTER_MODELS.CLAUDE_4_SONNET]: 200000,
    [OPENROUTER_MODELS.OPEN_AI_GPT_5_NANO]: 400000,
    [OPENROUTER_MODELS.OPEN_AI_GPT_5]: 400000,
    [ANTHROPIC_MODELS.SONNET_4]: 200000,
    [ANTHROPIC_MODELS.HAIKU]: 200000,
} as const;
