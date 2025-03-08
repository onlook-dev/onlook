import { createAnthropic } from '@ai-sdk/anthropic';
import type { StreamRequestType } from '@onlook/models/chat';
import { BASE_PROXY_ROUTE, FUNCTIONS_ROUTE, ProxyRoutes } from '@onlook/models/constants';
import { CLAUDE_MODELS, LLMProvider, MCP_MODELS } from '@onlook/models/llm';
import { type LanguageModelV1 } from 'ai';
import { getRefreshedAuthTokens } from '../auth';
export interface OnlookPayload {
    requestType: StreamRequestType;
}

export async function initModel(
    provider: LLMProvider,
    model: CLAUDE_MODELS | MCP_MODELS,
    payload: OnlookPayload,
): Promise<LanguageModelV1> {
    switch (provider) {
        case LLMProvider.ANTHROPIC:
            return await getAnthropicProvider(model as CLAUDE_MODELS, payload);
        case LLMProvider.MCP:
            return await getMCPProvider(model as MCP_MODELS, payload);
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

    const config: {
        apiKey?: string;
        baseURL?: string;
        headers?: Record<string, string>;
    } = {};

    if (apiKey) {
        config.apiKey = apiKey;
    } else {
        const authTokens = await getRefreshedAuthTokens();
        if (!authTokens) {
            throw new Error('No auth tokens found');
        }
        config.apiKey = '';
        config.baseURL = proxyUrl;
        config.headers = {
            Authorization: `Bearer ${authTokens.accessToken}`,
            'X-Onlook-Request-Type': payload.requestType,
        };
    }

    const anthropic = createAnthropic(config);
    return anthropic(model, {
        cacheControl: true,
    });
}

async function getMCPProvider(model: MCP_MODELS, payload: OnlookPayload): Promise<LanguageModelV1> {
    // Import the MCP client and adapter
    const { MCPClient, createMCPLanguageModel } = await import('@onlook/ai/mcp');

    // Create a new MCP client
    const client = new MCPClient({
        name: 'onlook-mcp-client',
        version: '1.0.0',
    });

    // Connect to the MCP server
    // Note: The connection details would need to be configured
    await client.connect({
        type: 'stdio',
        command: 'mcp-server', // This would need to be configured
        args: ['--stdio'],
    });

    // Initialize the client
    await client.initialize();

    // Create a language model adapter that implements the LanguageModelV1 interface
    return createMCPLanguageModel({
        client,
        model: model.toString(),
    });
}
