export enum LLMProvider {
    ANTHROPIC = 'anthropic',
    BEDROCK = 'bedrock',
    GOOGLE_VERTEX = 'google-vertex',
    OPENAI = 'openai',
    GOOGLE_AI_STUDIO = 'google-ai-studio',
}

export enum CLAUDE_MODELS {
    SONNET_4 = 'claude-sonnet-4-20250514',
    SONNET_3_7 = 'claude-3-7-sonnet-20250219',
    HAIKU = 'claude-3-5-haiku-20241022',
}

export const BEDROCK_MODEL_MAP = {
    [CLAUDE_MODELS.SONNET_4]: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    [CLAUDE_MODELS.SONNET_3_7]: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
    [CLAUDE_MODELS.HAIKU]: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
};

export const VERTEX_MODEL_MAP = {
    [CLAUDE_MODELS.SONNET_4]: 'claude-sonnet-4@20250514',
    [CLAUDE_MODELS.SONNET_3_7]: 'claude-3-7-sonnet@20250219',
    [CLAUDE_MODELS.HAIKU]: 'claude-3-5-haiku@20241022',
};

export enum OPENAI_MODELS {
    GPT_4_1 = 'gpt-4.1',
    GPT_4_1_MINI = 'gpt-4.1-mini',
    GPT_4O = 'gpt-4o',
}

export enum GEMINI_MODELS {
    GEMINI_2_5_PRO = 'gemini-2.5-pro',
    GEMINI_2_5_PRO_PREVIEW_TTS = 'gemini-2.5-pro-preview-tts',
    GEMINI_2_5_FLASH = 'gemini-2.5-flash',
}

interface ModelMapping {
    [LLMProvider.ANTHROPIC]: CLAUDE_MODELS;
    [LLMProvider.BEDROCK]: CLAUDE_MODELS;
    [LLMProvider.GOOGLE_VERTEX]: CLAUDE_MODELS;
    [LLMProvider.OPENAI]: OPENAI_MODELS;
    [LLMProvider.GOOGLE_AI_STUDIO]: GEMINI_MODELS;
}

export type InitialModelPayload = {
    [K in keyof ModelMapping]: {
        provider: K;
        model: ModelMapping[K];
    };
}[keyof ModelMapping];
