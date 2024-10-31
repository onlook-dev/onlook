import type { CoreAssistantMessage, CoreMessage, CoreUserMessage } from 'ai';
import type { AssistantContentBlock, TextBlock } from './content';

interface BaseChatMessage {
    id: string;
    type: ChatMessageType;
    role: ChatMessageRole;
    toPreviousMessage(): CoreMessage;
    toCurrentMessage(): CoreMessage;
}

export interface UserChatMessage extends BaseChatMessage {
    type: ChatMessageType.USER;
    role: ChatMessageRole.USER;
    content: TextBlock[];
    toPreviousMessage(): CoreUserMessage;
    toCurrentMessage(): CoreUserMessage;
}

export interface AssistantChatMessage extends BaseChatMessage {
    type: ChatMessageType.ASSISTANT;
    role: ChatMessageRole.ASSISTANT;
    content: AssistantContentBlock[];
    toPreviousMessage(): CoreAssistantMessage;
    toCurrentMessage(): CoreAssistantMessage;
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

export * from './content';
export * from './context';
export * from './response';
