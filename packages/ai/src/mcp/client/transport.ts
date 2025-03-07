/**
 * Transport implementations for MCP client
 */

import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { TransportOptions } from './types';
import { MCPError, MCPErrorType } from './types';

/**
 * Create a transport for connecting to an MCP server
 *
 * @param options Transport options
 * @returns Transport instance
 */
export async function createTransport(options: TransportOptions): Promise<Transport> {
    try {
        switch (options.type) {
            case 'stdio':
                if (!options.command) {
                    throw new MCPError(
                        'Command is required for stdio transport',
                        MCPErrorType.VALIDATION_ERROR,
                    );
                }
                return new StdioClientTransport({
                    command: options.command,
                    args: options.args || [],
                });
            case 'websocket':
                if (!options.url) {
                    throw new MCPError(
                        'URL is required for websocket transport',
                        MCPErrorType.VALIDATION_ERROR,
                    );
                }
                throw new MCPError(
                    'WebSocket transport is not yet implemented',
                    MCPErrorType.VALIDATION_ERROR,
                );
            default:
                throw new MCPError(
                    `Unsupported transport type: ${(options as any).type}`,
                    MCPErrorType.VALIDATION_ERROR,
                );
        }
    } catch (error) {
        if (error instanceof MCPError) {
            throw error;
        }
        throw new MCPError(
            `Failed to create transport: ${error instanceof Error ? error.message : String(error)}`,
            MCPErrorType.TRANSPORT_ERROR,
            error,
        );
    }
}
