import type { MCPServerConfig, MCPTool, MCPExecutionResult } from './types';

interface ProjectRuntimeState {
    configs: MCPServerConfig[];
    tools: MCPTool[];
    lastRestart: Date | null;
}

/**
 * Minimal in-memory implementation so higher layers can integrate without instantly failing.
 * This simulates MCP server lifecycle until a real process manager is wired in.
 */
export class MCPIntegrationService {
    private runtimeStore: Map<string, ProjectRuntimeState> = new Map();

    async setupMCP(projectId: string, configs: MCPServerConfig[]): Promise<void> {
        if (!configs.length) {
            throw new Error('At least one MCP server config is required');
        }

        const normalizedConfigs = this.normalizeConfigs(configs);
        const tools = this.generateToolMetadata(normalizedConfigs);

        this.runtimeStore.set(projectId, {
            configs: normalizedConfigs,
            tools,
            lastRestart: null,
        });
    }

    async getAvailableTools(projectId: string): Promise<MCPTool[]> {
        const state = this.runtimeStore.get(projectId);
        if (!state) {
            return [];
        }
        return state.tools;
    }

    async executeTool(
        projectId: string,
        toolName: string,
        args: Record<string, unknown>
    ): Promise<MCPExecutionResult> {
        const state = this.runtimeStore.get(projectId);
        if (!state) {
            throw new Error('MCP not configured for project');
        }

        const tool = state.tools.find(t => t.name === toolName);
        if (!tool) {
            return {
                success: false,
                error: `Tool ${toolName} not found for project`,
            };
        }

        return {
            success: true,
            result: {
                tool: tool.name,
                server: tool.serverName,
                args,
                executedAt: new Date().toISOString(),
            },
        };
    }

    async restartServers(projectId: string): Promise<void> {
        const state = this.runtimeStore.get(projectId);
        if (!state) {
            throw new Error('MCP not configured for project');
        }

        state.lastRestart = new Date();
    }

    getLastRestart(projectId: string): Date | null {
        return this.runtimeStore.get(projectId)?.lastRestart ?? null;
    }

    private normalizeConfigs(configs: MCPServerConfig[]): MCPServerConfig[] {
        const seen = new Set<string>();
        return configs.map(config => {
            const key = config.name.toLowerCase();
            if (seen.has(key)) {
                throw new Error(`Duplicate MCP server name detected: ${config.name}`);
            }
            seen.add(key);
            return {
                ...config,
                args: config.args ?? [],
                autoApprove: config.autoApprove ?? [],
            };
        });
    }

    private generateToolMetadata(configs: MCPServerConfig[]): MCPTool[] {
        return configs.flatMap(config => {
            if (!config.autoApprove?.length) {
                return [
                    {
                        name: `${config.name}-exec`,
                        description: `Invoke ${config.name} command`,
                        inputSchema: {},
                        serverName: config.name,
                    },
                ];
            }

            return config.autoApprove.map(toolName => ({
                name: toolName,
                description: `Auto-approved tool exposed by ${config.name}`,
                inputSchema: {},
                serverName: config.name,
            }));
        });
    }
}