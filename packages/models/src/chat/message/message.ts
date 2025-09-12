import { BUILD_TOOL_SET } from '@onlook/ai';
import type { InferUITools, JSONValue, UIMessage, UIMessagePart } from 'ai';
import { z } from 'zod';
import type { CodeDiff } from '../../code/index.ts';
import type { MessageCheckpoints } from './checkpoint.ts';
import type { MessageContext } from './context.ts';

// Metadata schema for chat messages - start simple and extend as needed
export const chatMetadataSchema = z.object({});

type ChatMetadata = z.infer<typeof chatMetadataSchema>;

// Data part schema for custom data types
export const dataPartSchema = z.object({
    weather: z.object({
        weather: z.string().optional(),
        location: z.string().optional(),
        temperature: z.number().optional(),
        loading: z.boolean().default(true),
    }),
});

export type ChatDataPart = z.infer<typeof dataPartSchema>;

// Tool set inference
export type ChatToolSet = InferUITools<typeof BUILD_TOOL_SET>;

// Provider metadata type
export type ChatProviderMetadata = Record<string, Record<string, JSONValue>>;

// Main UI message types
export type ChatUIMessage = UIMessage<ChatMetadata, ChatDataPart, ChatToolSet>;
export type ChatUIMessagePart = UIMessagePart<ChatDataPart, ChatToolSet>;

// Chat message role constants
export const ChatMessageRole = {
    USER: 'user' as const,
    ASSISTANT: 'assistant' as const,
    SYSTEM: 'system' as const,
} as const;

export type ChatMessageRole = (typeof ChatMessageRole)[keyof typeof ChatMessageRole];

// Internal metadata structure for our chat messages
export interface InternalChatMetadata {
    vercelId?: string;
    context: MessageContext[];
    checkpoints: MessageCheckpoints[];
}

// Chat message interfaces
interface BaseChatMessage {
    id: string;
    createdAt: Date;
    role: ChatMessageRole;
    threadId: string;
    parts: ChatUIMessagePart[];
    metadata: InternalChatMetadata;
}

export interface UserChatMessage extends BaseChatMessage {
    role: typeof ChatMessageRole.USER;
}

export interface AssistantChatMessage extends BaseChatMessage {
    role: typeof ChatMessageRole.ASSISTANT;
}

export type ChatSnapshot = Record<string, CodeDiff>;

export type ChatMessage = UserChatMessage | AssistantChatMessage;
