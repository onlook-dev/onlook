export interface MCPServerConfig {
    name: string;
    command: string;
    args: string[];
    env?: Record<string, string>;
    autoApprove?: string[];
}

export interface MCPTool {
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
    serverName: string;
}

export interface MCPExecutionResult {
    success: boolean;
    result?: unknown;
    error?: string;
}