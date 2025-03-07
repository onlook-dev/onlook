/**
 * Tool capability management for MCP client
 */

import { z } from 'zod';
import type { Tool } from '../client/types';
import { MCPClient } from '../client';
import { MCPError, MCPErrorType } from '../client/types';

/**
 * Validate tool arguments against the tool's input schema
 *
 * @param tool Tool to validate arguments for
 * @param args Arguments to validate
 * @returns Validated arguments
 */
export function validateToolArgs(
    tool: Tool,
    args: Record<string, unknown>,
): Record<string, unknown> {
    try {
        const schema = createZodSchema(tool.inputSchema);
        return schema.parse(args);
    } catch (error) {
        throw new MCPError(
            `Invalid arguments for tool ${tool.name}: ${error instanceof Error ? error.message : String(error)}`,
            MCPErrorType.VALIDATION_ERROR,
            error,
        );
    }
}

/**
 * Create a Zod schema from a JSON schema
 *
 * @param schema JSON schema
 * @returns Zod schema
 */
export function createZodSchema(schema: any): z.ZodTypeAny {
    if (!schema) {
        return z.any();
    }

    const type = schema.type;

    if (type === 'string') {
        let stringSchema = z.string();
        if (schema.pattern) {
            stringSchema = stringSchema.regex(new RegExp(schema.pattern));
        }
        if (schema.minLength !== undefined) {
            stringSchema = stringSchema.min(schema.minLength);
        }
        if (schema.maxLength !== undefined) {
            stringSchema = stringSchema.max(schema.maxLength);
        }
        return stringSchema;
    } else if (type === 'number') {
        let numberSchema = z.number();
        if (schema.minimum !== undefined) {
            numberSchema = numberSchema.min(schema.minimum);
        }
        if (schema.maximum !== undefined) {
            numberSchema = numberSchema.max(schema.maximum);
        }
        return numberSchema;
    } else if (type === 'integer') {
        let intSchema = z.number().int();
        if (schema.minimum !== undefined) {
            intSchema = intSchema.min(schema.minimum);
        }
        if (schema.maximum !== undefined) {
            intSchema = intSchema.max(schema.maximum);
        }
        return intSchema;
    } else if (type === 'boolean') {
        return z.boolean();
    } else if (type === 'array') {
        const items = schema.items || {};
        let arraySchema = z.array(createZodSchema(items));
        if (schema.minItems !== undefined) {
            arraySchema = arraySchema.min(schema.minItems);
        }
        if (schema.maxItems !== undefined) {
            arraySchema = arraySchema.max(schema.maxItems);
        }
        return arraySchema;
    } else if (type === 'object') {
        const properties = schema.properties || {};
        const shape: Record<string, z.ZodTypeAny> = {};

        for (const [key, value] of Object.entries(properties)) {
            shape[key] = createZodSchema(value);
        }

        let objectSchema = z.object(shape);

        if (schema.required && Array.isArray(schema.required)) {
            const required = schema.required as string[];
            for (const key of required) {
                if (shape[key]) {
                    shape[key] = shape[key].optional();
                }
            }
        }

        return objectSchema;
    } else {
        return z.any();
    }
}

/**
 * Call a tool with validated arguments
 *
 * @param client MCP client
 * @param toolName Name of the tool to call
 * @param args Arguments for the tool
 * @returns Result of the tool call
 */
export async function callToolWithValidation(
    client: MCPClient,
    toolName: string,
    args: Record<string, unknown>,
) {
    const tools = await client.listTools();
    const tool = tools.tools.find((t) => t.name === toolName);

    if (!tool) {
        throw new MCPError(`Tool not found: ${toolName}`, MCPErrorType.TOOL_CALL_ERROR);
    }

    // @ts-ignore - The SDK types don't match our types exactly
    const validatedArgs = validateToolArgs(tool, args);
    return await client.callTool(tool.name, validatedArgs);
}

/**
 * Generate an example for a tool
 *
 * @param tool Tool to generate an example for
 * @returns Example arguments for the tool
 */
export function generateToolExample(tool: Tool): Record<string, unknown> | null {
    if (!tool.inputSchema || !tool.inputSchema.properties) {
        return null;
    }

    const exampleArgs: Record<string, unknown> = {};

    for (const [propName, prop] of Object.entries(tool.inputSchema.properties)) {
        const typedProp = prop as { type: string };
        if (typedProp.type === 'string') {
            exampleArgs[propName] = 'example_string';
        } else if (typedProp.type === 'number' || typedProp.type === 'integer') {
            exampleArgs[propName] = 42;
        } else if (typedProp.type === 'boolean') {
            exampleArgs[propName] = true;
        } else if (typedProp.type === 'array') {
            exampleArgs[propName] = [];
        } else if (typedProp.type === 'object') {
            exampleArgs[propName] = {};
        }
    }

    return exampleArgs;
}
