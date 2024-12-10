export enum MessageContextType {
    FILE = 'file',
    HIGHLIGHT = 'highlight',
    IMAGE = 'image',
}

type BaseMessageContext = {
    type: MessageContextType;
    content: string;
    displayName: string;
};

export type FileMessageContext = BaseMessageContext & {
    type: MessageContextType.FILE;
    path: string;
};

export type HighlightedMessageContext = BaseMessageContext & {
    type: MessageContextType.HIGHLIGHT;
    path: string;
    start: number;
    end: number;
};

export type ImageMessageContext = BaseMessageContext & {
    type: MessageContextType.IMAGE;
};

export type ChatMessageContext =
    | FileMessageContext
    | HighlightedMessageContext
    | ImageMessageContext;
