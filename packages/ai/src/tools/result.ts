type ToolOutputResult = {
    state?: 'output-available';
    tool: string;
    toolCallId: string;
    output: unknown;
    errorText?: never;
};

type ToolErrorResult = {
    state: 'output-error';
    tool: string;
    toolCallId: string;
    output?: never;
    errorText: string;
};

export type AddToolResult = (toolResult: ToolOutputResult | ToolErrorResult) => Promise<void>;

export function formatToolCallError(error: unknown): string {
    if (error instanceof Error) {
        return error.message || error.name || 'Unknown tool error';
    }

    if (typeof error === 'string') {
        return error;
    }

    try {
        return JSON.stringify(error) ?? String(error);
    } catch {
        return String(error);
    }
}

export function createToolErrorResult(
    tool: string,
    toolCallId: string,
    error: unknown,
): ToolErrorResult {
    return {
        state: 'output-error',
        tool,
        toolCallId,
        errorText: formatToolCallError(error),
    };
}
