export enum LLMProvider {
    ANTHROPIC = 'anthropic',
    BEDROCK = 'bedrock',
    GOOGLE_VERTEX = 'google-vertex',
}

export enum CLAUDE_MODELS {
    SONNET_4 = 'claude-sonnet-4-20250514',
    SONNET_3_7 = 'claude-3-7-sonnet-20250219',
    HAIKU = 'claude-3-5-haiku-20241022',
}

export enum VERTEX_MODELS {
    GEMINI_FLASH = 'gemini-1.5-flash',
}

export const BEDROCK_MODEL_MAP = {
    [CLAUDE_MODELS.SONNET_4]: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
    [CLAUDE_MODELS.SONNET_3_7]: 'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
    [CLAUDE_MODELS.HAIKU]: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
};

export const VERTEX_MODEL_MAP = {
    [CLAUDE_MODELS.SONNET_4]: 'claude-sonnet-4',
    [CLAUDE_MODELS.SONNET_3_7]: 'claude-3-7-sonnet',
    [CLAUDE_MODELS.HAIKU]: 'claude-3-5-haiku',
};
