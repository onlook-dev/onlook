/**
 * Error utilities for MCP client
 */

import { MCPError, MCPErrorType } from '../client/types';

/**
 * Create a connection error
 *
 * @param message Error message
 * @param cause Error cause
 * @returns MCP error
 */
export function createConnectionError(message: string, cause?: unknown): MCPError {
    return new MCPError(message, MCPErrorType.CONNECTION_ERROR, cause);
}

/**
 * Create an initialization error
 *
 * @param message Error message
 * @param cause Error cause
 * @returns MCP error
 */
export function createInitializationError(message: string, cause?: unknown): MCPError {
    return new MCPError(message, MCPErrorType.INITIALIZATION_ERROR, cause);
}

/**
 * Create a tool call error
 *
 * @param message Error message
 * @param cause Error cause
 * @returns MCP error
 */
export function createToolCallError(message: string, cause?: unknown): MCPError {
    return new MCPError(message, MCPErrorType.TOOL_CALL_ERROR, cause);
}

/**
 * Create a resource error
 *
 * @param message Error message
 * @param cause Error cause
 * @returns MCP error
 */
export function createResourceError(message: string, cause?: unknown): MCPError {
    return new MCPError(message, MCPErrorType.RESOURCE_ERROR, cause);
}

/**
 * Create a prompt error
 *
 * @param message Error message
 * @param cause Error cause
 * @returns MCP error
 */
export function createPromptError(message: string, cause?: unknown): MCPError {
    return new MCPError(message, MCPErrorType.PROMPT_ERROR, cause);
}

/**
 * Create a transport error
 *
 * @param message Error message
 * @param cause Error cause
 * @returns MCP error
 */
export function createTransportError(message: string, cause?: unknown): MCPError {
    return new MCPError(message, MCPErrorType.TRANSPORT_ERROR, cause);
}

/**
 * Create a validation error
 *
 * @param message Error message
 * @param cause Error cause
 * @returns MCP error
 */
export function createValidationError(message: string, cause?: unknown): MCPError {
    return new MCPError(message, MCPErrorType.VALIDATION_ERROR, cause);
}

/**
 * Create an unknown error
 *
 * @param message Error message
 * @param cause Error cause
 * @returns MCP error
 */
export function createUnknownError(message: string, cause?: unknown): MCPError {
    return new MCPError(message, MCPErrorType.UNKNOWN_ERROR, cause);
}
