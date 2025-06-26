import { bedrock } from '@ai-sdk/amazon-bedrock';
import { createAnthropic } from '@ai-sdk/anthropic';
import { vertex } from '@ai-sdk/google-vertex';
import {
    BEDROCK_MODEL_MAP,
    CLAUDE_MODELS,
    LLMProvider,
    VERTEX_MODELS,
    VERTEX_MODEL_MAP,
} from '@onlook/models';
import { assertNever } from '@onlook/utility';
import { type LanguageModelV1 } from 'ai';

export async function initModel(
    provider: LLMProvider,
    model: CLAUDE_MODELS | VERTEX_MODELS,
): Promise<{ model: LanguageModelV1; providerOptions: Record<string, any> }> {
    switch (provider) {
        case LLMProvider.ANTHROPIC:
            return {
                model: await getAnthropicProvider(model),
                providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
            };
        case LLMProvider.BEDROCK:
            return {
                model: await getBedrockProvider(model),
                providerOptions: { bedrock: { cachePoint: { type: 'default' } } },
            };
        case LLMProvider.GOOGLE_VERTEX:
            return {
                model: await getVertexProvider(model),
                providerOptions: {},
            };
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

async function getBedrockProvider(claudeModel: CLAUDE_MODELS) {
    if (
        !process.env.AWS_ACCESS_KEY_ID ||
        !process.env.AWS_SECRET_ACCESS_KEY ||
        !process.env.AWS_REGION
    ) {
        throw new Error('AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and AWS_REGION must be set');
    }

    const bedrockModel = BEDROCK_MODEL_MAP[claudeModel];
    return bedrock(bedrockModel);
}

async function getVertexProvider(model: CLAUDE_MODELS | VERTEX_MODELS) {
    if (
        !process.env.GOOGLE_APPLICATION_CREDENTIALS &&
        (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY)
    ) {
        throw new Error(
            'GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY must be set',
        );
    }

    const vertexModel = VERTEX_MODEL_MAP[model as CLAUDE_MODELS] ?? (model as VERTEX_MODELS);

    return vertex(vertexModel);
}
