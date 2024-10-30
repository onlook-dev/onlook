import type { TemplateNode } from '../../element/templateNode';

interface BaseMessageContext {
    type: string;
    value: string;
    name: string;
}

export interface FileMessageContext extends BaseMessageContext {
    type: 'file';
}

export interface HighlightedMessageContext extends BaseMessageContext {
    type: 'selected';
    templateNode: TemplateNode;
}

export interface ImageMessageContext extends BaseMessageContext {
    type: 'image';
}

export type ChatMessageContext =
    | FileMessageContext
    | HighlightedMessageContext
    | ImageMessageContext;
