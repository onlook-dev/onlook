import { type ChatMessage } from '@onlook/models';
import type { TextUIPart, ToolUIPart } from 'ai';
import { encode } from 'gpt-tokenizer';

export interface ModelLimits {
    maxTokens: number;
    contextWindow: number;
    inputLimit: number;
    outputLimit: number;
}

export const MODEL_LIMITS: Record<string, ModelLimits> = {
    'claude-sonnet-4-20250514': {
        maxTokens: 1000000,
        contextWindow: 1000000,
        inputLimit: 800000,
        outputLimit: 200000,
    },
    'claude-3-5-haiku-20241022': {
        maxTokens: 200000,
        contextWindow: 200000,
        inputLimit: 180000,
        outputLimit: 200000,
    },
    'anthropic/claude-sonnet-4': {
        maxTokens: 1000000,
        contextWindow: 1000000,
        inputLimit: 800000,
        outputLimit: 200000,
    },
    'anthropic/claude-3.5-haiku': {
        maxTokens: 200000,
        contextWindow: 200000,
        inputLimit: 180000,
        outputLimit: 200000,
    },
    'openai/gpt-5': {
        maxTokens: 400000,
        contextWindow: 400000,
        inputLimit: 272000,
        outputLimit: 400000,
    },
    'openai/gpt-5-mini': {
        maxTokens: 400000,
        contextWindow: 400000,
        inputLimit: 272000,
        outputLimit: 400000,
    },
    'openai/gpt-5-nano': {
        maxTokens: 400000,
        contextWindow: 400000,
        inputLimit: 272000,
        outputLimit: 400000,
    },
    'gpt-5': {
        maxTokens: 400000,
        contextWindow: 400000,
        inputLimit: 272000,
        outputLimit: 128000,
    },
    'claude-sonnet-4': {
        maxTokens: 1000000,
        contextWindow: 1000000,
        inputLimit: 800000,
        outputLimit: 200000,
    },
    'claude-3-5-haiku': {
        maxTokens: 200000,
        contextWindow: 200000,
        inputLimit: 180000,
        outputLimit: 8000,
    },
    default: {
        maxTokens: 128000,
        contextWindow: 128000,
        inputLimit: 100000,
        outputLimit: 4000,
    },
};

export function getModelLimits(modelId: string): ModelLimits {
    return MODEL_LIMITS[modelId] || MODEL_LIMITS['default']!;
}

export async function countTokensWithRoles(messages: ChatMessage[]): Promise<number> {
    const perMessageExtra = 4;
    const perReplyExtra = 2;
    let total = 0;
    for (const m of messages) {
        const content = m.parts
            .map((p) => {
                if (p.type === 'text') {
                    return (p as TextUIPart).text;
                } else if (p.type.startsWith('tool-')) {
                    return JSON.stringify((p as ToolUIPart).input);
                }
                return '';
            })
            .join('');
        total += encode(content).length + perMessageExtra;
    }
    return total + perReplyExtra;
}

export interface TokenUsage {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
}

export function countTokensInString(text: string): number {
    return encode(text).length;
}

export async function getContextUsage(
    messages: ChatMessage[],
    modelId: string = 'openai:gpt-4',
): Promise<{
    usage: TokenUsage;
    limits: ModelLimits;
    percentage: number;
}> {
    const totalTokens = await countTokensWithRoles(messages);
    const limits = getModelLimits(modelId);
    const inputTokens = Math.floor(totalTokens * 0.8);
    const outputTokens = totalTokens - inputTokens;

    const usage: TokenUsage = {
        inputTokens,
        outputTokens,
        totalTokens,
    };

    const percentage = (totalTokens / limits.contextWindow) * 100;

    return {
        usage,
        limits,
        percentage,
    };
}
