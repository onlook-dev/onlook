import { createAmazonBedrock, type AmazonBedrockProviderSettings } from '@ai-sdk/amazon-bedrock';
import { createAnthropic } from '@ai-sdk/anthropic';
import type { StreamRequestType } from '@onlook/models/chat';
import { BASE_PROXY_ROUTE, FUNCTIONS_ROUTE, ProxyRoutes } from '@onlook/models/constants';
import { BEDROCK_MODEL_MAP, CLAUDE_MODELS, LLMProvider } from '@onlook/models/llm';
import { type LanguageModelV1 } from 'ai';
import { getRefreshedAuthTokens } from '../auth';

export interface OnlookPayload {
    requestType: StreamRequestType;
}

export async function initModel(
    provider: LLMProvider,
    model: CLAUDE_MODELS,
    payload: OnlookPayload,
): Promise<LanguageModelV1> {
    switch (provider) {
        case LLMProvider.ANTHROPIC:
            return await getAnthropicProvider(model, payload);
        default:
            throw new Error(`Unsupported provider: ${provider}`);
    }
}

async function getAnthropicProvider(
    model: CLAUDE_MODELS,
    payload: OnlookPayload,
): Promise<LanguageModelV1> {
    const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
    const proxyUrl = `${import.meta.env.VITE_SUPABASE_API_URL}${FUNCTIONS_ROUTE}${BASE_PROXY_ROUTE}${ProxyRoutes.ANTHROPIC}`;

    if (apiKey) {
        // Use provided API key
        const anthropic = createAnthropic({
            apiKey,
        });
        return anthropic(model, {
            cacheControl: true,
        });
    }

    const config: AmazonBedrockProviderSettings = {};

    // Use proxy URL
    const authTokens = await getRefreshedAuthTokens();
    if (!authTokens) {
        throw new Error('No auth tokens found');
    }
    config.accessKeyId = '';
    config.secretAccessKey = '';
    config.region = '';
    config.baseURL = proxyUrl;
    config.headers = {
        Authorization: `Bearer ${authTokens.accessToken}`,
        'X-Onlook-Request-Type': payload.requestType,
        'anthropic-beta': 'output-128k-2025-02-19',
    };
    return createAnthropicBedrock(config, model);
}

const createAnthropicBedrock = (
    config: AmazonBedrockProviderSettings,
    claudeModel: CLAUDE_MODELS,
) => {
    const bedrock = createAmazonBedrock(config);
    const bedrockModel = BEDROCK_MODEL_MAP[claudeModel];
    return bedrock(bedrockModel);
};
