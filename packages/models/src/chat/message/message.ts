import type { ChatTools } from '@onlook/ai';
import type { JSONValue, UIMessage, UIMessagePart } from 'ai';
import type { MessageCheckpoints } from './checkpoint.ts';
import type { MessageContext } from './context.ts';

export type ChatMetadata = {
    createdAt: Date;
    conversationId: string;
    context: MessageContext[];
    checkpoints: MessageCheckpoints[];
    finishReason?: string;
};

export type ChatProviderMetadata = Record<string, Record<string, JSONValue>>;
export type ChatDataPart = {};
export type ChatMessagePart = UIMessagePart<ChatDataPart, ChatTools>;
export type ChatMessage = UIMessage<ChatMetadata, ChatDataPart, ChatTools>;
