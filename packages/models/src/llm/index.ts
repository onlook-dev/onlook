export enum LLMProvider {
    ANTHROPIC = 'anthropic',
    BEDROCK = 'bedrock',
}

export enum CLAUDE_MODELS {
    SONNET_4 = 'claude-sonnet-4-20250514',
    SONNET_3_7 = 'claude-3-7-sonnet-20250219',
    HAIKU = 'claude-3-5-haiku-20241022',
}

export const BEDROCK_MODEL_MAP = {
    [CLAUDE_MODELS.SONNET_4]: 'anthropic.claude-sonnet-4-20250514-v1:0',
    [CLAUDE_MODELS.SONNET_3_7]: 'anthropic.claude-3-7-sonnet-20250219-v1:0',
    [CLAUDE_MODELS.HAIKU]: 'anthropic.claude-3-5-haiku-20241022-v1:0',
};
