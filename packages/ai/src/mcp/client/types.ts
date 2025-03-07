/**
 * Type definitions for the MCP client
 */

import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';

/**
 * Tool definition
 */
export interface Tool {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties?: Record<
            string,
            {
                type: string;
                description?: string;
            }
        >;
        required?: string[];
    };
}

/**
 * Prompt definition
 */
export interface Prompt {
    name: string;
    description?: string;
    arguments?: Array<{
        name: string;
        description?: string;
        required?: boolean;
    }>;
}

/**
 * Resource definition
 */
export interface Resource {
    name: string;
    description?: string;
    uri: string;
}

/**
 * Resource template definition
 */
export interface ResourceTemplate {
    name: string;
    description: string;
    uriTemplate: string;
}

/**
 * Options for creating an MCP client
 */
export interface MCPClientOptions {
    /**
     * Name of the client
     * @default "onlook-mcp-client"
     */
    name?: string;

    /**
     * Version of the client
     * @default "1.0.0"
     */
    version?: string;
}

/**
 * Transport options for connecting to an MCP server
 */
export interface TransportOptions {
    /**
     * Type of transport to use
     */
    type: 'stdio' | 'websocket';

    /**
     * Command to execute for stdio transport
     */
    command?: string;

    /**
     * Arguments for the command for stdio transport
     */
    args?: string[];

    /**
     * URL for websocket transport
     */
    url?: string;
}

/**
 * Root declaration for MCP servers
 */
export interface Root {
    /**
     * URI of the root
     */
    uri: string;

    /**
     * Name of the root
     */
    name: string;
}

/**
 * Server capabilities returned from initialization
 */
export interface ServerCapabilities {
    capabilities: {
        tools?: Record<string, unknown>;
        resources?: Record<string, unknown>;
        prompts?: Record<string, unknown>;
        roots?: Record<string, unknown>;
        sampling?: Record<string, unknown>;
    };
    serverInfo: {
        name: string;
        version: string;
    };
}

/**
 * Result of a tool call
 */
export interface ToolCallResult {
    /**
     * Whether the tool call resulted in an error
     */
    isError?: boolean;

    /**
     * Content of the tool call result
     */
    content: Array<{
        type: string;
        text: string;
    }>;
}

/**
 * MCP error types
 */
export enum MCPErrorType {
    CONNECTION_ERROR = 'connection_error',
    INITIALIZATION_ERROR = 'initialization_error',
    TOOL_CALL_ERROR = 'tool_call_error',
    RESOURCE_ERROR = 'resource_error',
    PROMPT_ERROR = 'prompt_error',
    TRANSPORT_ERROR = 'transport_error',
    VALIDATION_ERROR = 'validation_error',
    UNKNOWN_ERROR = 'unknown_error',
}

/**
 * MCP error
 */
export class MCPError extends Error {
    type: MCPErrorType;
    cause?: unknown;

    constructor(message: string, type: MCPErrorType, cause?: unknown) {
        super(message);
        this.name = 'MCPError';
        this.type = type;
        this.cause = cause;
    }
}

/**
 * Export SDK types for convenience
 */
export type { Client, Transport };
