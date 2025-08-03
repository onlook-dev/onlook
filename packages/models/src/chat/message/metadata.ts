import type { ChatMessageContext } from './context.ts';
import type { MessageSnapshot } from './snapshot.ts';

export interface BaseChatMessageMetadata {
    createdAt: Date;
}

export interface UserChatMessageMetadata extends BaseChatMessageMetadata {
    snapshots: MessageSnapshot[];
    context: ChatMessageContext[];
}

export interface AssistantChatMessageMetadata extends BaseChatMessageMetadata {
    snapshots: MessageSnapshot[];
}
