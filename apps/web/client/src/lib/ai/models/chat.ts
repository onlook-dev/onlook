import type { ChatTools } from '../tools/toolset';
import type { UIMessage, UIMessagePart, LanguageModelUsage, FinishReason, JSONValue } from 'ai';
import type { MessageContext, MessageCheckpoints } from '@onlook/models';

export enum ChatType {
    ASK = 'ask',
    CREATE = 'create',
    EDIT = 'edit',
    FIX = 'fix',
}

export type ChatMetadata = {
    createdAt: Date;
    conversationId: string;
    context: MessageContext[];
    checkpoints: MessageCheckpoints[];
    finishReason?: FinishReason;
    usage?: LanguageModelUsage;
    error?: string;
};

export type ChatDataPart = {};
export type ChatMessagePart = UIMessagePart<ChatDataPart, ChatTools>;
export type ChatMessage = UIMessage<ChatMetadata, ChatDataPart, ChatTools>;
export type ChatProviderMetadata = Record<string, Record<string, JSONValue>>;

export type QueuedMessage = {
    id: string;
    content: string;
    type: ChatType;
    timestamp: Date;
    context: MessageContext[];
};

export type { GitMessageCheckpoint, MessageContext } from '@onlook/models';
export { MessageCheckpointType } from '@onlook/models';
