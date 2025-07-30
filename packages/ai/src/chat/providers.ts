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
    OPENROUTER_MODELS,
    VERTEX_MODEL_MAP,
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

    switch (requestedProvider) {
        case LLMProvider.ANTHROPIC:
            model = await getAnthropicProvider(requestedModel);
            break;
        case LLMProvider.BEDROCK:
            model = await getBedrockProvider(requestedModel);
            providerOptions = { bedrock: { cachePoint: { type: 'default' } } };
            break;
        case LLMProvider.GOOGLE_VERTEX:
            model = await getVertexProvider(requestedModel);
            break;
        case LLMProvider.OPENAI:
            model = await getOpenAIProvider(requestedModel);
            break;
        case LLMProvider.GOOGLE_AI_STUDIO:
            model = await getGoogleProvider(requestedModel);
            break;
        case LLMProvider.OPENROUTER:
            model = await getOpenRouterProvider(requestedModel);
            headers = {
                'HTTP-Referer': 'https://onlook.com',
                'X-Title': 'Onlook',
            };
            const isClaude =
                requestedModel === OPENROUTER_MODELS.CLAUDE_4_SONNET ||
                requestedModel === OPENROUTER_MODELS.CLAUDE_3_5_HAIKU;
            providerOptions = isClaude
                ? { anthropic: { cacheControl: { type: 'ephemeral' } } }
                : undefined;
            break;
        default:
            assertNever(requestedProvider);
    }

    return {
        model,
        providerOptions,
        headers,
    };
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

async function getOpenRouterProvider(model: OPENROUTER_MODELS): Promise<LanguageModelV1> {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('OPENROUTER_API_KEY must be set');
    }
    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
    return openrouter(model);
}
