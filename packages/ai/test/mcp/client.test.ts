/**
 * Tests for the MCP client
 */

import { describe, test, expect, beforeEach, afterEach, mock } from 'bun:test';
import { MCPClient } from '../../src/mcp/client';
import { MCPError, MCPErrorType } from '../../src/mcp/client/types';

// Mock the transport
const mockTransport = {
    connect: mock(() => Promise.resolve()),
    send: mock(() => Promise.resolve()),
    close: mock(() => Promise.resolve()),
    onMessage: mock(() => {}),
};

// Mock the client
mock.module('@modelcontextprotocol/sdk/client/index.js', () => ({
    Client: class MockClient {
        constructor() {}
        connect = mock(() => Promise.resolve());
        initialize = mock(() =>
            Promise.resolve({
                capabilities: {
                    tools: {},
                    resources: {},
                    prompts: {},
                },
                serverInfo: {
                    name: 'mock-server',
                    version: '1.0.0',
                },
            }),
        );
        listTools = mock(() =>
            Promise.resolve({
                tools: [
                    {
                        name: 'mock-tool',
                        description: 'A mock tool',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                input: {
                                    type: 'string',
                                },
                            },
                        },
                    },
                ],
            }),
        );
        listPrompts = mock(() =>
            Promise.resolve({
                prompts: [
                    {
                        name: 'mock-prompt',
                        description: 'A mock prompt',
                        arguments: [
                            {
                                name: 'input',
                                description: 'Input for the prompt',
                                required: true,
                            },
                        ],
                    },
                ],
            }),
        );
        listResources = mock(() =>
            Promise.resolve({
                resources: [
                    {
                        name: 'mock-resource',
                        description: 'A mock resource',
                        uri: 'mock://resource',
                    },
                ],
                resourceTemplates: [
                    {
                        name: 'mock-template',
                        description: 'A mock template',
                        uriTemplate: 'mock://template/{param}',
                    },
                ],
            }),
        );
        callTool = mock(() =>
            Promise.resolve({
                content: [
                    {
                        type: 'text',
                        text: 'Mock tool result',
                    },
                ],
            }),
        );
        readResource = mock(() =>
            Promise.resolve({
                content: 'Mock resource content',
            }),
        );
        subscribeToResource = mock(() => Promise.resolve());
        unsubscribeFromResource = mock(() => Promise.resolve());
        setRequestHandler = mock(() => {});
        setNotificationHandler = mock(() => {});
        close = mock(() => Promise.resolve());
    },
}));

// Mock the transport creation
mock.module('../../src/mcp/client/transport', () => ({
    createTransport: mock(() => Promise.resolve(mockTransport)),
}));

describe('MCPClient', () => {
    let client: MCPClient;

    beforeEach(() => {
        client = new MCPClient({
            name: 'test-client',
            version: '1.0.0',
        });
    });

    afterEach(() => {
        mock.restore();
    });

    test('should create a client with default options', () => {
        const defaultClient = new MCPClient();
        expect(defaultClient).toBeDefined();
    });

    test('should connect to a server', async () => {
        await client.connect({
            type: 'stdio',
            command: 'mock-command',
        });
        expect(client.isConnected()).toBe(true);
    });

    test('should initialize the client', async () => {
        await client.connect({
            type: 'stdio',
            command: 'mock-command',
        });
        const capabilities = await client.initialize();
        expect(client.isInitialized()).toBe(true);
        expect(capabilities).toBeDefined();
        expect(capabilities.serverInfo.name).toBe('mock-server');
    });

    test('should list tools', async () => {
        await client.connect({
            type: 'stdio',
            command: 'mock-command',
        });
        await client.initialize();
        const tools = await client.listTools();
        expect(tools).toBeDefined();
        expect(tools.tools.length).toBe(1);
        expect(tools.tools[0].name).toBe('mock-tool');
    });

    test('should list prompts', async () => {
        await client.connect({
            type: 'stdio',
            command: 'mock-command',
        });
        await client.initialize();
        const prompts = await client.listPrompts();
        expect(prompts).toBeDefined();
        expect(prompts.prompts.length).toBe(1);
        expect(prompts.prompts[0].name).toBe('mock-prompt');
    });

    test('should list resources', async () => {
        await client.connect({
            type: 'stdio',
            command: 'mock-command',
        });
        await client.initialize();
        const resources = await client.listResources();
        expect(resources).toBeDefined();
        expect(resources.resources.length).toBe(1);
        expect(resources.resources[0].name).toBe('mock-resource');
    });

    test('should call a tool', async () => {
        await client.connect({
            type: 'stdio',
            command: 'mock-command',
        });
        await client.initialize();
        const result = await client.callTool('mock-tool', { input: 'test' });
        expect(result).toBeDefined();
        expect(result.content[0].text).toBe('Mock tool result');
    });

    test('should read a resource', async () => {
        await client.connect({
            type: 'stdio',
            command: 'mock-command',
        });
        await client.initialize();
        const result = await client.readResource('mock://resource');
        expect(result).toBeDefined();
        expect(result.content).toBe('Mock resource content');
    });

    test('should close the client', async () => {
        await client.connect({
            type: 'stdio',
            command: 'mock-command',
        });
        await client.initialize();
        await client.close();
        expect(client.isConnected()).toBe(false);
        expect(client.isInitialized()).toBe(false);
    });

    test('should throw an error if not connected', async () => {
        await expect(client.initialize()).rejects.toThrow(MCPError);
    });

    test('should throw an error if not initialized', async () => {
        await client.connect({
            type: 'stdio',
            command: 'mock-command',
        });
        await expect(client.listTools()).rejects.toThrow(MCPError);
    });
});
