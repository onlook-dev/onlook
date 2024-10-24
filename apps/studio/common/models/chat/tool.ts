export const GENERATE_CODE_TOOL_NAME = 'generate_code';

export interface ToolCodeChange {
    fileName: string;
    value: string;
    description: string;
}

export interface ToolCodeChangeResult {
    type: 'tool_result';
    tool_use_id: string;
    content: 'applied' | 'rejected';
}
