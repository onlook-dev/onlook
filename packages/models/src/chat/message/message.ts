import type { CodeDiff } from '../../code/index.ts';
import type { MessageCheckpoints } from './checkpoint.ts';
import type { MessageContext } from './context.ts';
import type { UIMessage } from 'ai';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
}
export interface ChatMessageContent {
    format: 3;
    parts: UIMessage['parts'];
    metadata: {
        vercelId?: string;
        context: MessageContext[];
        checkpoints: MessageCheckpoints[];
    };
}

interface BaseChatMessage {
    id: string;
    createdAt: Date;
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
