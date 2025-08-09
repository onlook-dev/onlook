import type { Message as ReactMessage } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import type { CodeDiff } from '../../code/index.ts';
import { type ChatMessageContext } from './context.ts';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

export interface UserChatMessage extends ReactMessage {
    role: ChatMessageRole.USER;
    context: ChatMessageContext[];
    parts: UIMessage['parts'];
    content: string;
    commitOid: string | null;
}

export interface AssistantChatMessage extends ReactMessage {
    role: ChatMessageRole.ASSISTANT;
    applied: boolean;
    snapshots: ChatSnapshot;
    parts: UIMessage['parts'];
    content: string;
}

export type ChatSnapshot = Record<string, CodeDiff>;

export interface SystemChatMessage extends ReactMessage {
    role: ChatMessageRole.SYSTEM;
}

export type ChatMessage = UserChatMessage | AssistantChatMessage | SystemChatMessage;
