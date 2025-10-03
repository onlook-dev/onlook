import type { ChatTools } from '@onlook/ai';
import type { FinishReason, JSONValue, LanguageModelUsage, UIMessage, UIMessagePart } from 'ai';
import type { MessageCheckpoints } from './checkpoint';
import type { MessageContext } from './context';

export type ChatMetadata = {
    createdAt: Date;
    conversationId: string;
    context: MessageContext[];
    checkpoints: MessageCheckpoints[];
    finishReason?: FinishReason;
    usage?: LanguageModelUsage;
    error?: string;
};

export type ChatProviderMetadata = Record<string, Record<string, JSONValue>>;
export type ChatDataPart = {};
export type ChatMessagePart = UIMessagePart<ChatDataPart, ChatTools>;
export type ChatMessage = UIMessage<ChatMetadata, ChatDataPart, ChatTools>;
