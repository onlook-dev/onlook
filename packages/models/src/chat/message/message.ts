import type { UIMessage } from '@ai-sdk/react';
import type {
    AssistantChatMessageMetadata,
    BaseChatMessageMetadata,
    UserChatMessageMetadata,
} from './metadata.ts';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

export interface UserChatMessage extends UIMessage<UserChatMessageMetadata> {
    role: ChatMessageRole.USER;
}

export interface AssistantChatMessage extends UIMessage<AssistantChatMessageMetadata> {
    role: ChatMessageRole.ASSISTANT;
}

export interface SystemChatMessage extends UIMessage<BaseChatMessageMetadata> {
    role: ChatMessageRole.SYSTEM;
}

export type ChatMessage = UserChatMessage | AssistantChatMessage | SystemChatMessage;
