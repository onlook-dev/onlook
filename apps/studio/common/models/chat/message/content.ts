export type TextBlock = {
    type: 'text';
    value: string;
};

export type CodeChangeBlock = {
    type: 'code';
    id: string;
    fileName: string;
    value: string;
    original: string;
    applied: boolean;
};

export type UserContentBlock = TextBlock;
export type AssistantContentBlock = TextBlock | CodeChangeBlock;
