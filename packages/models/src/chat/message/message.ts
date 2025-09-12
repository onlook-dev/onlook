import type { ChatTools } from '@onlook/ai';
import type { JSONValue, UIMessage, UIMessagePart } from 'ai';
import type { MessageCheckpoints } from './checkpoint.ts';
import type { MessageContext } from './context.ts';

// interface BaseChatMessage {
//     id: string;
//     createdAt: Date;
//     role: ChatMessageRole;
//     threadId: string;
//     parts: UIMessage['parts'];
//     metadata: {
//         vercelId?: string;
//         context: MessageContext[];
//         checkpoints: MessageCheckpoints[];
//     };
// }

// export interface UserChatMessage extends BaseChatMessage {
//     role: ChatMessageRole.USER;
// }

// export interface AssistantChatMessage extends BaseChatMessage {
//     role: ChatMessageRole.ASSISTANT;
// }

export type ChatMetadata = {
    createdAt: Date;
    conversationId: string;
    vercelId: string;
    context: MessageContext[];
    checkpoints: MessageCheckpoints[];
};

export type ChatProviderMetadata = Record<string, Record<string, JSONValue>>;
export type ChatDataPart = {};
export type ChatMessagePart = UIMessagePart<ChatDataPart, ChatTools>;
export type ChatMessage = UIMessage<ChatMetadata, ChatDataPart, ChatTools>;
