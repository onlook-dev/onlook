import { ToolCodeChange } from '../tool';

export type TextContentBlock = {
    type: 'text';
    text: string;
};

export type CodeChangeContentBlock = {
    id: string;
    type: 'code';
    changes: ToolCodeChange[];
};

export type ChatContentBlock = TextContentBlock | CodeChangeContentBlock;
