/**
 * Context formatting for MCP client
 */

import type { Tool, Prompt, Resource } from '../client/types';
import { generateToolExample } from '../capabilities';

/**
 * Format MCP capabilities for LLM consumption
 */
export class LLMContextFormatter {
    /**
     * Format tools for LLM consumption
     *
     * @param tools Tools to format
     * @param format Format to use
     * @returns Formatted tools
     */
    static formatTools(
        tools: Tool[],
        format: 'anthropic' | 'openai' | 'generic' = 'generic',
    ): Record<string, unknown> {
        if (format === 'anthropic') {
            return {
                tools: tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    input_schema: tool.inputSchema,
                })),
            };
        } else if (format === 'openai') {
            return {
                functions: tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.inputSchema,
                })),
            };
        } else {
            return {
                tools: tools.map((tool) => ({
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.inputSchema,
                    example: generateToolExample(tool),
                })),
            };
        }
    }

    /**
     * Format prompts for LLM consumption
     *
     * @param prompts Prompts to format
     * @returns Formatted prompts
     */
    static formatPrompts(prompts: Prompt[]): Record<string, unknown> {
        return {
            prompts: prompts.map((prompt) => ({
                name: prompt.name,
                description: prompt.description,
                arguments: prompt.arguments,
            })),
        };
    }

    /**
     * Format resources for LLM consumption
     *
     * @param resources Resources to format
     * @returns Formatted resources
     */
    static formatResources(resources: Resource[]): Record<string, unknown> {
        return {
            resources: resources.map((resource) => ({
                name: resource.name,
                description: resource.description,
                uri: resource.uri,
            })),
        };
    }

    /**
     * Format all capabilities for LLM consumption
     *
     * @param capabilities Capabilities to format
     * @param format Format to use
     * @returns Formatted capabilities
     */
    static formatAllCapabilities(
        capabilities: {
            tools: Tool[];
            prompts: Prompt[];
            resources: Resource[];
        },
        format: 'anthropic' | 'openai' | 'generic' = 'generic',
    ): Record<string, unknown> {
        return {
            ...this.formatTools(capabilities.tools, format),
            ...this.formatPrompts(capabilities.prompts),
            ...this.formatResources(capabilities.resources),
        };
    }
}
