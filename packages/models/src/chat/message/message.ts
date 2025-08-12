import type { MastraMessageContentV2 } from '@mastra/core/agent';
import type { MastraMessageV2 } from '@mastra/core/memory';
import type { CodeDiff } from '../../code/index.ts';
import type { ChatMessageContext } from './context.ts';
import type { MessageSnapshot } from './snapshot.ts';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
}
export interface ChatMessageContent extends MastraMessageContentV2 {
    metadata:
        | {
              vercelId?: string;
              context?: ChatMessageContext[];
              snapshots?: MessageSnapshot[];
          }
        | undefined;
}

interface BaseChatMessage extends MastraMessageV2 {
    role: ChatMessageRole;
    threadId: string;
    content: ChatMessageContent;
}

export interface UserChatMessage extends BaseChatMessage {
    role: ChatMessageRole.USER;
}

export interface AssistantChatMessage extends BaseChatMessage {
    role: ChatMessageRole.ASSISTANT;
}

export type ChatSnapshot = Record<string, CodeDiff>;

export type ChatMessage = UserChatMessage | AssistantChatMessage;
