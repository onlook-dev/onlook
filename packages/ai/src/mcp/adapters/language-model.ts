/**
 * MCP language model adapter for the AI SDK
 */

import type { LanguageModelV1, LanguageModelV1CallOptions } from 'ai';
import { MCPClient } from '../client';
import { MCPCapabilityManager } from '../context/manager';
import { MCPError, MCPErrorType } from '../client/types';

/**
 * Options for creating an MCP language model adapter
 */
export interface MCPLanguageModelOptions {
    /**
     * MCP client
     */
    client: MCPClient;

    /**
     * Capability manager
     */
    capabilityManager?: MCPCapabilityManager;

    /**
     * Model name
     */
    model?: string;
}

/**
 * Create an MCP language model adapter
 *
 * @param options Options for creating the adapter
 * @returns Language model adapter
 */
export function createMCPLanguageModel(options: MCPLanguageModelOptions): LanguageModelV1 {
    const { client, capabilityManager, model } = options;

    // Create a capability manager if not provided
    const manager = capabilityManager || new MCPCapabilityManager(client);

    return {
        id: `mcp-${model || 'default'}`,
        provider: 'mcp',
        doGenerate: async (options: LanguageModelV1CallOptions) => {
            try {
                // Refresh capabilities if needed
                if (!manager.getCapabilities().tools.length) {
                    await manager.refreshAll();
                }

                // Find a suitable tool for text generation
                const tools = manager.getCapabilities().tools;
                const generateTool = tools.find(
                    (tool) => tool.name === 'generate' || tool.name.includes('generate'),
                );

                if (!generateTool) {
                    throw new MCPError(
                        'No text generation tool found',
                        MCPErrorType.TOOL_CALL_ERROR,
                    );
                }

                // Extract parameters from options
                const { maxTokens, temperature, topP, stopSequences } = options;

                // Prepare messages for the tool call
                const messages = [];

                // Add user content if available
                if (options.prompt) {
                    messages.push({ role: 'user', content: options.prompt });
                }

                // Call the tool with the messages
                const result = await client.callTool(generateTool.name, {
                    messages,
                    maxTokens,
                    temperature,
                    topP,
                    stopSequences,
                });

                // Extract the text from the result
                const text = result.content.map((item) => item.text).join('');

                return {
                    text,
                    toolCalls: undefined,
                    finishReason: 'stop',
                    usage: {
                        promptTokens: 0,
                        completionTokens: 0,
                        totalTokens: 0,
                    },
                };
            } catch (error) {
                if (error instanceof MCPError) {
                    throw error;
                }

                throw new MCPError(
                    `Failed to generate text: ${error instanceof Error ? error.message : String(error)}`,
                    MCPErrorType.TOOL_CALL_ERROR,
                    error,
                );
            }
        },
    };
}
