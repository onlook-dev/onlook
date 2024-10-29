import type { ToolCodeChange, ToolCodeChangeResult } from '../tool';

export type TextContentBlock = {
    type: 'text';
    text: string;
};

export type CodeChangeContentBlock = {
    id: string;
    type: 'code';
    changes: ToolCodeChangeContent[];
};

export interface ToolCodeChangeContent extends ToolCodeChange {
    original: string;
    applied: boolean;
    loading: boolean;
}

export type SystemContentBlock = ToolCodeChangeResult;
export type AssistantContentBlock = TextContentBlock | CodeChangeContentBlock;
