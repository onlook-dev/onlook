import { MessageParam } from '@anthropic-ai/sdk/resources';
import { AssistantContentBlock, SystemContentBlock, TextContentBlock } from './content';
import { ChatMessageContext } from './context';

interface BaseChatMessage {
    id: string;
    type: ChatMessageType;
    role: ChatMessageRole;
    toPreviousParam(): MessageParam;
    toCurrentParam(): MessageParam;
}

export interface UserChatMessage extends BaseChatMessage {
    type: ChatMessageType.USER;
    role: ChatMessageRole.USER;
    content: TextContentBlock[];
    context: ChatMessageContext[];
}

export interface AssistantChatMessage extends BaseChatMessage {
    type: ChatMessageType.ASSISTANT;
    role: ChatMessageRole.ASSISTANT;
    content: AssistantContentBlock[];
}

export interface SystemChatMessage extends BaseChatMessage {
    type: ChatMessageType.SYSTEM;
    role: ChatMessageRole.USER;
    content: SystemContentBlock[];
}

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
}

export enum ChatMessageType {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}
