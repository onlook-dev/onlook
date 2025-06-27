import type { Message } from '@ai-sdk/react';
import type { TextPart } from 'ai';
import type { CodeDiff } from '../../code/index.ts';
import { type ChatMessageContext } from './context.ts';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

export interface UserChatMessage extends Message {
    role: ChatMessageRole.USER;
    context: ChatMessageContext[];
    parts: TextPart[];
    content: string;
    commitOid: string | null;
}

export interface AssistantChatMessage extends Message {
    role: ChatMessageRole.ASSISTANT;
    applied: boolean;
    snapshots: ChatSnapshot;
    parts: Message['parts'];
    content: string;
}

export type ChatSnapshot = Record<string, CodeDiff>;

export interface SystemChatMessage extends Message {
    role: ChatMessageRole.SYSTEM;
}

export type ChatMessage = UserChatMessage | AssistantChatMessage | SystemChatMessage;
