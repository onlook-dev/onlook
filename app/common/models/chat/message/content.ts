import { ToolCodeChange } from '../tool';

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
}

export type ChatContentBlock = TextContentBlock | CodeChangeContentBlock;
