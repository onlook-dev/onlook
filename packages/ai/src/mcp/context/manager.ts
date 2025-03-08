/**
 * Context management for MCP client
 */

import type { Tool, Prompt, Resource } from '../client/types';
import { MCPClient } from '../client';
import { generateToolExample } from '../capabilities';

/**
 * Manager for MCP capabilities and context
 */
export class MCPCapabilityManager {
    private client: MCPClient;
    private capabilities: {
        tools?: Tool[];
        prompts?: Prompt[];
        resources?: Resource[];
    } = {};
    private lastUpdate: number | null = null;

    /**
     * Create a new capability manager
     *
     * @param client MCP client
     */
    constructor(client: MCPClient) {
        this.client = client;

        // Set up notification handlers for capability changes
        client.setNotificationHandler(
            'notifications/tools/list_changed',
            this.handleToolsChanged.bind(this),
        );
        client.setNotificationHandler(
            'notifications/prompts/list_changed',
            this.handlePromptsChanged.bind(this),
        );
        client.setNotificationHandler(
            'notifications/resources/list_changed',
            this.handleResourcesChanged.bind(this),
        );
    }

    /**
     * Refresh all capabilities
     */
    async refreshAll(): Promise<void> {
        await this.refreshTools();
        await this.refreshPrompts();
        await this.refreshResources();
        this.lastUpdate = Date.now();
    }

    /**
     * Refresh tools
     */
    async refreshTools(): Promise<void> {
        try {
            const tools = await this.client.listTools();
            // @ts-ignore - The SDK types don't match our types exactly
            this.capabilities.tools = tools.tools;
        } catch (error) {
            console.error('Error refreshing tools:', error);
        }
    }

    /**
     * Refresh prompts
     */
    async refreshPrompts(): Promise<void> {
        try {
            const prompts = await this.client.listPrompts();
            // @ts-ignore - The SDK types don't match our types exactly
            this.capabilities.prompts = prompts.prompts;
        } catch (error) {
            console.error('Error refreshing prompts:', error);
        }
    }

    /**
     * Refresh resources
     */
    async refreshResources(): Promise<void> {
        try {
            const resources = await this.client.listResources();
            // @ts-ignore - The SDK types don't match our types exactly
            this.capabilities.resources = resources.resources;
        } catch (error) {
            console.error('Error refreshing resources:', error);
        }
    }

    /**
     * Handle tools changed notification
     */
    private handleToolsChanged(): void {
        this.refreshTools();
    }

    /**
     * Handle prompts changed notification
     */
    private handlePromptsChanged(): void {
        this.refreshPrompts();
    }

    /**
     * Handle resources changed notification
     */
    private handleResourcesChanged(): void {
        this.refreshResources();
    }

    /**
     * Get all capabilities
     *
     * @returns All capabilities
     */
    getCapabilities(): {
        tools: Tool[];
        prompts: Prompt[];
        resources: Resource[];
    } {
        return {
            tools: this.capabilities.tools || [],
            prompts: this.capabilities.prompts || [],
            resources: this.capabilities.resources || [],
        };
    }

    /**
     * Get the last update time
     *
     * @returns Last update time in milliseconds since epoch
     */
    getLastUpdateTime(): number | null {
        return this.lastUpdate;
    }
}
