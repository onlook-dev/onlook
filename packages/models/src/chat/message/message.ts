import type { Message } from '@ai-sdk/react';
import type { CodeDiff } from '../../code/index.ts';
import { type ChatMessageContext } from './context.ts';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
    TOOL = 'tool',
}

export interface UserChatMessage extends Message {
    context: ChatMessageContext[];
}

export interface AssistantChatMessage extends Message {
    applied: boolean;
    snapshots: Record<string, CodeDiff> | null;
}

export interface SystemChatMessage extends Message {
    id: string;
}

export type ChatMessage =
    | UserChatMessage
    | AssistantChatMessage
    | SystemChatMessage;
