import { bedrock } from '@ai-sdk/amazon-bedrock';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createVertexAnthropic } from '@ai-sdk/google-vertex/anthropic/edge';
import { createOpenAI } from '@ai-sdk/openai';
import {
    BEDROCK_MODEL_MAP,
    CLAUDE_MODELS,
    GEMINI_MODELS,
    LLMProvider,
    OPENAI_MODELS,
    VERTEX_MODEL_MAP,
    type InitialModelPayload,
} from '@onlook/models';
import { assertNever } from '@onlook/utility';
import { type LanguageModelV1 } from 'ai';

export async function initModel({
    provider,
    model,
}: InitialModelPayload): Promise<{ model: LanguageModelV1; providerOptions: Record<string, any> }> {
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
        case LLMProvider.OPENAI:
            return {
                model: await getOpenAIProvider(model),
                providerOptions: { openai: { cacheControl: { type: 'ephemeral' } } },
            };
        case LLMProvider.GOOGLE_AI_STUDIO:
            return {
                model: await getGoogleProvider(model),
                providerOptions: { google: { cacheControl: { type: 'ephemeral' } } },
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

async function getVertexProvider(model: CLAUDE_MODELS) {
    if (
        !process.env.GOOGLE_CLIENT_EMAIL ||
        !process.env.GOOGLE_PRIVATE_KEY ||
        !process.env.GOOGLE_PROJECT_ID ||
        !process.env.GOOGLE_LOCATION
    ) {
        throw new Error(
            'GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GOOGLE_PROJECT_ID, and GOOGLE_LOCATION must be set',
        );
    }

    const vertexModel = VERTEX_MODEL_MAP[model];
    return createVertexAnthropic({
        project: process.env.GOOGLE_PROJECT_ID,
        location: process.env.GOOGLE_LOCATION,
        googleCredentials: {
            clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
            privateKey: process.env.GOOGLE_PRIVATE_KEY,
        },
    })(vertexModel);
}

async function getOpenAIProvider(model: OPENAI_MODELS): Promise<LanguageModelV1> {
    if (!process.env.OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY must be set');
    }
    const openai = createOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });

    return openai(model);
}

async function getGoogleProvider(model: GEMINI_MODELS): Promise<LanguageModelV1> {
    if (!process.env.GOOGLE_AI_STUDIO_API_KEY) {
        throw new Error('GOOGLE_AI_STUDIO_API_KEY must be set');
    }
    const google = createGoogleGenerativeAI({
        apiKey: process.env.GOOGLE_AI_STUDIO_API_KEY,
    });
    return google(model);
}
