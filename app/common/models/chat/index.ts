import { TemplateNode } from '../element/templateNode';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

export type TextMessagePart = {
    type: 'text';
    text: string;
};

export type ImageMessagePart = {
    type: 'image';
    imageUrl: string;
};

export type MessageContent = (TextMessagePart | ImageMessagePart)[];

export interface FileMessageContext {
    type: 'file';
    value: string;
    name: string;
}

export interface HighlightedMessageContext {
    type: 'selected';
    value: string;
    templateNode: TemplateNode;
}

export type ChatMessageContext = FileMessageContext;
export interface ChatMessage {
    role: ChatMessageRole;
    content: MessageContent;
    context: ChatMessageContext[];
}
