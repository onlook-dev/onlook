import type { MastraMessageV2 } from '@mastra/core/memory';
import type { CodeDiff } from '../../code/index.ts';
import { type ChatMessageContext } from './context.ts';
import type { MessageSnapshot } from './snapshot.ts';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

interface BaseChatMessage extends Omit<MastraMessageV2, 'role'> {
    role: ChatMessageRole;
}

export interface UserChatMessage extends BaseChatMessage {
    role: ChatMessageRole.USER;
    context: ChatMessageContext[];
    snapshots: MessageSnapshot[];
}

export interface AssistantChatMessage extends BaseChatMessage {
    role: ChatMessageRole.ASSISTANT;
    applied: boolean;
    snapshots: MessageSnapshot[];
}

export type ChatSnapshot = Record<string, CodeDiff>;

export interface SystemChatMessage extends BaseChatMessage {
    role: ChatMessageRole.SYSTEM;
}

export type ChatMessage = UserChatMessage | AssistantChatMessage | SystemChatMessage;
