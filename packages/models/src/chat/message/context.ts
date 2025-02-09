export enum MessageContextType {
    FILE = 'file',
    HIGHLIGHT = 'highlight',
    IMAGE = 'image',
    ERROR = 'error',
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

export type HighlightMessageContext = BaseMessageContext & {
    type: MessageContextType.HIGHLIGHT;
    path: string;
    start: number;
    end: number;
};

export type ImageMessageContext = BaseMessageContext & {
    type: MessageContextType.IMAGE;
    mimeType: string;
};

export type ErrorMessageContext = BaseMessageContext & {
    type: MessageContextType.ERROR;
};

export type ChatMessageContext =
    | FileMessageContext
    | HighlightMessageContext
    | ImageMessageContext
    | ErrorMessageContext;
