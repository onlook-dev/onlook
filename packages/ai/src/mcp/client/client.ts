/**
 * Core MCP client implementation
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { createTransport } from './transport';
import type {
    MCPClientOptions,
    Root,
    ServerCapabilities,
    ToolCallResult,
    TransportOptions,
} from './types';
import { MCPError, MCPErrorType } from './types';

/**
 * MCP client for communicating with MCP servers
 */
export class MCPClient {
    private client: Client;
    private connected: boolean = false;
    private initialized: boolean = false;
    private serverCapabilities: ServerCapabilities | null = null;

    /**
     * Create a new MCP client
     *
     * @param options Client options
     */
    constructor(options: MCPClientOptions = {}) {
        this.client = new Client(
            {
                name: options.name || 'onlook-mcp-client',
                version: options.version || '1.0.0',
            },
            {},
        );
    }

    /**
     * Connect to an MCP server
     *
     * @param transportOptions Transport options
     */
    async connect(transportOptions: TransportOptions): Promise<void> {
        try {
            const transport = await createTransport(transportOptions);
            await this.connectWithTransport(transport);
        } catch (error) {
            if (error instanceof MCPError) {
                throw error;
            }
            throw new MCPError(
                `Failed to connect to MCP server: ${error instanceof Error ? error.message : String(error)}`,
                MCPErrorType.CONNECTION_ERROR,
                error,
            );
        }
    }

    /**
     * Connect to an MCP server with a transport
     *
     * @param transport Transport instance
     */
    async connectWithTransport(transport: Transport): Promise<void> {
        try {
            await this.client.connect(transport);
            this.connected = true;
        } catch (error) {
            throw new MCPError(
                `Failed to connect to MCP server: ${error instanceof Error ? error.message : String(error)}`,
                MCPErrorType.CONNECTION_ERROR,
                error,
            );
        }
    }

    /**
     * Initialize the MCP client
     *
     * @param roots Optional roots to declare to the server
     * @returns Server capabilities
     */
    async initialize(roots?: Root[]): Promise<ServerCapabilities> {
        if (!this.connected) {
            throw new MCPError(
                'Client is not connected to a server',
                MCPErrorType.INITIALIZATION_ERROR,
            );
        }

        try {
            // @ts-ignore - The SDK types don't match our types exactly
            const response = await this.client.initialize({
                roots,
            });

            this.serverCapabilities = response as ServerCapabilities;
            this.initialized = true;
            return response as ServerCapabilities;
        } catch (error) {
            throw new MCPError(
                `Failed to initialize MCP client: ${error instanceof Error ? error.message : String(error)}`,
                MCPErrorType.INITIALIZATION_ERROR,
                error,
            );
        }
    }

    /**
     * List available tools from the server
     *
     * @returns List of available tools
     */
    async listTools() {
        this.ensureInitialized();

        try {
            // @ts-ignore - The SDK types don't match our types exactly
            return await this.client.listTools();
        } catch (error) {
            throw new MCPError(
                `Failed to list tools: ${error instanceof Error ? error.message : String(error)}`,
                MCPErrorType.TOOL_CALL_ERROR,
                error,
            );
        }
    }

    /**
     * List available prompts from the server
     *
     * @returns List of available prompts
     */
    async listPrompts() {
        this.ensureInitialized();

        try {
            // @ts-ignore - The SDK types don't match our types exactly
            return await this.client.listPrompts();
        } catch (error) {
            throw new MCPError(
                `Failed to list prompts: ${error instanceof Error ? error.message : String(error)}`,
                MCPErrorType.PROMPT_ERROR,
                error,
            );
        }
    }

    /**
     * List available resources from the server
     *
     * @returns List of available resources
     */
    async listResources() {
        this.ensureInitialized();

        try {
            // @ts-ignore - The SDK types don't match our types exactly
            return await this.client.listResources();
        } catch (error) {
            throw new MCPError(
                `Failed to list resources: ${error instanceof Error ? error.message : String(error)}`,
                MCPErrorType.RESOURCE_ERROR,
                error,
            );
        }
    }

    /**
     * Call a tool on the server
     *
     * @param name Name of the tool to call
     * @param args Arguments for the tool
     * @returns Result of the tool call
     */
    async callTool(name: string, args: Record<string, unknown>): Promise<ToolCallResult> {
        this.ensureInitialized();

        try {
            // @ts-ignore - The SDK types don't match our types exactly
            const result = await this.client.callTool({
                name,
                arguments: args,
            });
            return result as ToolCallResult;
        } catch (error) {
            throw new MCPError(
                `Failed to call tool ${name}: ${error instanceof Error ? error.message : String(error)}`,
                MCPErrorType.TOOL_CALL_ERROR,
                error,
            );
        }
    }

    /**
     * Read a resource from the server
     *
     * @param uri URI of the resource to read
     * @returns Resource content
     */
    async readResource(uri: string) {
        this.ensureInitialized();

        try {
            // @ts-ignore - The SDK types don't match our types exactly
            return await this.client.readResource({
                uri,
            });
        } catch (error) {
            throw new MCPError(
                `Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`,
                MCPErrorType.RESOURCE_ERROR,
                error,
            );
        }
    }

    /**
     * Subscribe to a resource for updates
     *
     * @param uri URI of the resource to subscribe to
     */
    async subscribeToResource(uri: string) {
        this.ensureInitialized();

        try {
            // @ts-ignore - The SDK types don't match our types exactly
            await this.client.subscribeResource({
                uri,
            });
        } catch (error) {
            throw new MCPError(
                `Failed to subscribe to resource ${uri}: ${error instanceof Error ? error.message : String(error)}`,
                MCPErrorType.RESOURCE_ERROR,
                error,
            );
        }
    }

    /**
     * Unsubscribe from a resource
     *
     * @param uri URI of the resource to unsubscribe from
     */
    async unsubscribeFromResource(uri: string) {
        this.ensureInitialized();

        try {
            // @ts-ignore - The SDK types don't match our types exactly
            await this.client.unsubscribeResource({
                uri,
            });
        } catch (error) {
            throw new MCPError(
                `Failed to unsubscribe from resource ${uri}: ${error instanceof Error ? error.message : String(error)}`,
                MCPErrorType.RESOURCE_ERROR,
                error,
            );
        }
    }

    /**
     * Set a request handler for the client
     *
     * @param method Method to handle
     * @param handler Handler function
     */
    setRequestHandler<T, R>(method: string, handler: (params: T) => Promise<R>) {
        // @ts-ignore - The SDK types don't match our types exactly
        this.client.setRequestHandler(method, handler);
    }

    /**
     * Set a notification handler for the client
     *
     * @param method Method to handle
     * @param handler Handler function
     */
    setNotificationHandler<T>(method: string, handler: (params: T) => void) {
        // @ts-ignore - The SDK types don't match our types exactly
        this.client.setNotificationHandler(method, handler);
    }

    /**
     * Close the connection to the server
     */
    async close() {
        try {
            await this.client.close();
            this.connected = false;
            this.initialized = false;
            this.serverCapabilities = null;
        } catch (error) {
            throw new MCPError(
                `Failed to close MCP client: ${error instanceof Error ? error.message : String(error)}`,
                MCPErrorType.CONNECTION_ERROR,
                error,
            );
        }
    }

    /**
     * Get the underlying client instance
     *
     * @returns Client instance
     */
    getClient(): Client {
        return this.client;
    }

    /**
     * Get the server capabilities
     *
     * @returns Server capabilities
     */
    getServerCapabilities(): ServerCapabilities | null {
        return this.serverCapabilities;
    }

    /**
     * Check if the client is connected
     *
     * @returns Whether the client is connected
     */
    isConnected(): boolean {
        return this.connected;
    }

    /**
     * Check if the client is initialized
     *
     * @returns Whether the client is initialized
     */
    isInitialized(): boolean {
        return this.initialized;
    }

    /**
     * Ensure that the client is initialized
     *
     * @throws MCPError if the client is not initialized
     */
    private ensureInitialized() {
        if (!this.initialized) {
            throw new MCPError('Client is not initialized', MCPErrorType.INITIALIZATION_ERROR);
        }
    }
}
