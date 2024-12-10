import { type ChatMessageContext } from './context';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
}

export enum ChatMessageType {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

export type BaseChatMessage = {
    id: string;
    type: ChatMessageType;
    role: ChatMessageRole;
    content: string;
};

export type UserChatMessage = BaseChatMessage & {
    type: ChatMessageType.USER;
    role: ChatMessageRole.USER;
    context: ChatMessageContext[];
};

export type AssistantChatMessage = BaseChatMessage & {
    type: ChatMessageType.ASSISTANT;
    role: ChatMessageRole.ASSISTANT;
};

export type ChatMessage = UserChatMessage | AssistantChatMessage;
