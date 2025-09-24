import { type JSONValue, type LanguageModelUsage, type UIMessage, type UIMessagePart } from 'ai';

import { type ChatTools } from '@onlook/ai';

import { type MessageCheckpoints } from './checkpoint.ts';
import { type MessageContext } from './context.ts';

export type ChatMetadata = {
    createdAt: Date;
    conversationId: string;
    context: MessageContext[];
    checkpoints: MessageCheckpoints[];
    finishReason?: string;
    usage?: LanguageModelUsage;
};

export type ChatProviderMetadata = Record<string, Record<string, JSONValue>>;
export type ChatDataPart = {};
export type ChatMessagePart = UIMessagePart<ChatDataPart, ChatTools>;
export type ChatMessage = UIMessage<ChatMetadata, ChatDataPart, ChatTools>;
