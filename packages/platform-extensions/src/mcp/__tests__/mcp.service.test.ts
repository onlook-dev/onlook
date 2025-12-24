import { describe, expect, it, beforeEach } from 'vitest';
import { MCPIntegrationService } from '../service';

const sampleConfig = [
    {
        name: 'repo-agent',
        command: 'node repo-agent.js',
        args: ['--watch'],
        env: { NODE_ENV: 'test' },
        autoApprove: ['repo-agent.summary'],
    },
];

describe('MCPIntegrationService', () => {
    let service: MCPIntegrationService;

    beforeEach(() => {
        service = new MCPIntegrationService();
    });

    it('normalizes configs and exposes tools after setup', async () => {
        await service.setupMCP('project-1', sampleConfig);
        const tools = await service.getAvailableTools('project-1');

        expect(tools).toHaveLength(1);
        expect(tools[0]).toMatchObject({
            name: 'repo-agent.summary',
            serverName: 'repo-agent',
        });
    });

    it('executes known tools using in-memory simulation', async () => {
        await service.setupMCP('project-2', sampleConfig);
        const result = await service.executeTool('project-2', 'repo-agent.summary', { branch: 'main' });

        expect(result.success).toBe(true);
        expect(result.result).toMatchObject({
            tool: 'repo-agent.summary',
            server: 'repo-agent',
        });
    });

    it('returns descriptive error when tool missing', async () => {
        await service.setupMCP('project-3', sampleConfig);
        const result = await service.executeTool('project-3', 'unknown.tool', {});

        expect(result.success).toBe(false);
        expect(result.error).toMatch(/unknown.tool/);
    });

    it('tracks server restarts', async () => {
        await service.setupMCP('project-4', sampleConfig);
        expect(service.getLastRestart('project-4')).toBeNull();

        await service.restartServers('project-4');
        expect(service.getLastRestart('project-4')).toBeInstanceOf(Date);
    });
});
