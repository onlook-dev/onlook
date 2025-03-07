/**
 * Prompt capability management for MCP client
 */

import type { Prompt } from '../client/types';
import { MCPClient } from '../client';
import { MCPError, MCPErrorType } from '../client/types';

/**
 * Find a prompt by name
 *
 * @param client MCP client
 * @param name Name of the prompt to find
 * @returns Prompt if found, null otherwise
 */
export async function findPromptByName(client: MCPClient, name: string): Promise<Prompt | null> {
    const prompts = await client.listPrompts();
    return prompts.prompts.find((p) => p.name === name) || null;
}

/**
 * Validate prompt arguments
 *
 * @param prompt Prompt to validate arguments for
 * @param args Arguments to validate
 * @returns Validated arguments
 */
export function validatePromptArgs(
    prompt: Prompt,
    args: Record<string, unknown>,
): Record<string, unknown> {
    if (!prompt.arguments || prompt.arguments.length === 0) {
        return {};
    }

    const validatedArgs: Record<string, unknown> = {};
    const missingRequired: string[] = [];

    for (const arg of prompt.arguments) {
        const value = args[arg.name];

        if (arg.required && (value === undefined || value === null)) {
            missingRequired.push(arg.name);
        } else if (value !== undefined) {
            validatedArgs[arg.name] = value;
        }
    }

    if (missingRequired.length > 0) {
        throw new MCPError(
            `Missing required arguments for prompt ${prompt.name}: ${missingRequired.join(', ')}`,
            MCPErrorType.VALIDATION_ERROR,
        );
    }

    return validatedArgs;
}

/**
 * Get a prompt with validated arguments
 *
 * @param client MCP client
 * @param promptName Name of the prompt to get
 * @param args Arguments for the prompt
 * @returns Prompt with validated arguments
 */
export async function getPromptWithValidation(
    client: MCPClient,
    promptName: string,
    args: Record<string, unknown>,
) {
    const prompt = await findPromptByName(client, promptName);

    if (!prompt) {
        throw new MCPError(`Prompt not found: ${promptName}`, MCPErrorType.PROMPT_ERROR);
    }

    const validatedArgs = validatePromptArgs(prompt, args);

    return {
        prompt,
        args: validatedArgs,
    };
}
