import type { CoreAssistantMessage, CoreSystemMessage, CoreUserMessage } from 'ai';
import type { CodeDiff } from '../../code/index.ts';
import { type ChatMessageContext } from './context.ts';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

export interface UserChatMessage extends CoreUserMessage {
    id: string;
    context: ChatMessageContext[];
}

export interface AssistantChatMessage extends CoreAssistantMessage {
    id: string;
    applied: boolean;
    snapshots: Record<string, CodeDiff> | null;
}

export interface SystemChatMessage extends CoreSystemMessage {
    id: string;
}

export type ChatMessage = UserChatMessage | AssistantChatMessage | SystemChatMessage;
