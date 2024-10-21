import { MessageParam } from '@anthropic-ai/sdk/resources';
import { TemplateNode } from '../element/templateNode';
import { ToolCodeChange } from './tool';

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

export interface BaseChatMessage {
    role: ChatMessageRole;
    toParam(): MessageParam;
}

export interface UserChatMessage extends BaseChatMessage {
    role: ChatMessageRole.USER;
    content: TextContentBlock[];
    context: ChatMessageContext[];
}

export interface AssistantChatMessage extends BaseChatMessage {
    role: ChatMessageRole.ASSISTANT;
    content: ChatContentBlock[];
}
