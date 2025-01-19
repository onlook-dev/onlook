import type { CodeDiff } from '../../code/index.ts';
import { type ChatMessageContext } from './context.ts';

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
    applied: boolean;
    snapshots: Record<string, CodeDiff> | null;
};

export type ChatMessage = UserChatMessage | AssistantChatMessage;
