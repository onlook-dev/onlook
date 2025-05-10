import type {
    AssistantChatMessage,
    ChatMessage,
    ChatMessageContext,
    TokenUsage,
} from '../message/index.ts';

export type ChatConversation = {
    id: string;
    projectId: string;
    displayName: string | null;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
    summaryMessage?: AssistantChatMessage | null;
    tokenUsage?: TokenUsage;
};

export type QueuedMessage = {
    content: string;
    context?: ChatMessageContext[];
};
