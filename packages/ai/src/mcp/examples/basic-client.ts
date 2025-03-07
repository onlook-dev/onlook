/**
 * Basic example of using the MCP client
 */

import { MCPClient } from '../client';
import { MCPCapabilityManager } from '../context';
import { LLMContextFormatter } from '../context';
import { createFileSystemRoot } from '../capabilities';
import { MCPLogger, LogLevel } from '../utils';

/**
 * Run the example
 */
async function runExample() {
    // Create a logger
    const logger = new MCPLogger({
        level: LogLevel.DEBUG,
        prefix: 'MCP-Example',
    });

    logger.info('Creating MCP client...');

    // Create a client
    const client = new MCPClient({
        name: 'onlook-mcp-example',
        version: '1.0.0',
    });

    try {
        // Connect to a server
        logger.info('Connecting to MCP server...');
        await client.connect({
            type: 'stdio',
            command: 'mcp-server',
            args: ['--stdio'],
        });

        // Initialize the client
        logger.info('Initializing MCP client...');
        const roots = [createFileSystemRoot('/path/to/project', 'Project Root')];
        const capabilities = await client.initialize(roots);
        logger.info('Server capabilities:', capabilities);

        // Create a capability manager
        logger.info('Creating capability manager...');
        const capabilityManager = new MCPCapabilityManager(client);
        await capabilityManager.refreshAll();

        // Get capabilities
        const allCapabilities = capabilityManager.getCapabilities();
        logger.info('Available tools:', allCapabilities.tools.length);
        logger.info('Available prompts:', allCapabilities.prompts.length);
        logger.info('Available resources:', allCapabilities.resources.length);

        // Format capabilities for LLM
        logger.info('Formatting capabilities for LLM...');
        const formattedCapabilities = LLMContextFormatter.formatAllCapabilities(
            allCapabilities,
            'anthropic',
        );
        logger.info('Formatted capabilities:', formattedCapabilities);

        // Call a tool
        if (allCapabilities.tools.length > 0) {
            const tool = allCapabilities.tools[0];
            logger.info(`Calling tool ${tool.name}...`);
            const result = await client.callTool(tool.name, {});
            logger.info('Tool result:', result);
        }

        // Close the client
        logger.info('Closing MCP client...');
        await client.close();
    } catch (error) {
        logger.error('Error:', error);
    }
}

// Run the example if this file is executed directly
if (typeof import.meta.main === 'boolean' && import.meta.main) {
    runExample().catch(console.error);
}
