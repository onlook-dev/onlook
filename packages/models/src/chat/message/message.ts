import type { CoreSystemMessage, FilePart, ImagePart, TextPart, ToolCallPart } from 'ai';
import type { CodeDiff } from '../../code/index.ts';
import { type ChatMessageContext } from './context.ts';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

export type UserChatContent = (TextPart | ImagePart | FilePart)[];
export type AssistantChatContent = (TextPart | ToolCallPart)[];

export interface UserChatMessage {
    id: string;
    role: ChatMessageRole.USER;
    context: ChatMessageContext[];
    content: UserChatContent;
}

export interface AssistantChatMessage {
    id: string;
    role: ChatMessageRole.ASSISTANT;
    applied: boolean;
    content: AssistantChatContent;
    snapshots: Record<string, CodeDiff> | null;
}

export interface SystemChatMessage extends CoreSystemMessage {
    id: string;
    role: ChatMessageRole.SYSTEM;
}

export type ChatMessage = UserChatMessage | AssistantChatMessage | SystemChatMessage;
