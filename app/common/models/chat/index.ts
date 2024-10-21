import { TemplateNode } from '../element/templateNode';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

export interface BaseMessageContext {
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

export interface ChatMessage {
    role: ChatMessageRole;
    content: string;
    context: ChatMessageContext[];
}
