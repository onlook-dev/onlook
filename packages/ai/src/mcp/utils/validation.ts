/**
 * Validation utilities for MCP client
 */

import { z } from 'zod';
import { MCPError, MCPErrorType } from '../client/types';

/**
 * Validate a value against a schema
 *
 * @param schema Schema to validate against
 * @param value Value to validate
 * @param errorMessage Error message to use if validation fails
 * @returns Validated value
 */
export function validate<T>(schema: z.ZodType<T>, value: unknown, errorMessage: string): T {
    try {
        return schema.parse(value);
    } catch (error) {
        throw new MCPError(
            `${errorMessage}: ${error instanceof Error ? error.message : String(error)}`,
            MCPErrorType.VALIDATION_ERROR,
            error,
        );
    }
}

/**
 * Create a schema for transport options
 *
 * @returns Schema for transport options
 */
export function createTransportOptionsSchema() {
    return z.discriminatedUnion('type', [
        z.object({
            type: z.literal('stdio'),
            command: z.string(),
            args: z.array(z.string()).optional(),
        }),
        z.object({
            type: z.literal('websocket'),
            url: z.string().url(),
        }),
    ]);
}

/**
 * Create a schema for client options
 *
 * @returns Schema for client options
 */
export function createClientOptionsSchema() {
    return z.object({
        name: z.string().optional(),
        version: z.string().optional(),
    });
}

/**
 * Create a schema for root declaration
 *
 * @returns Schema for root declaration
 */
export function createRootSchema() {
    return z.object({
        uri: z.string(),
        name: z.string(),
    });
}
