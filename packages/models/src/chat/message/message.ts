import type { CoreAssistantMessage, CoreMessage, CoreUserMessage } from 'ai';
import { z } from 'zod';
import type { AssistantContentBlock, TextBlock } from './content';

export enum ChatMessageRole {
    USER = 'user',
    ASSISTANT = 'assistant',
}

export enum ChatMessageType {
    USER = 'user',
    ASSISTANT = 'assistant',
    SYSTEM = 'system',
}

const BaseChatMessageSchema = z.object({
    id: z.string(),
    type: z.nativeEnum(ChatMessageType),
    role: z.nativeEnum(ChatMessageRole),
    toPreviousMessage: z.function().returns(z.custom<CoreMessage>()),
    toCurrentMessage: z.function().returns(z.custom<CoreMessage>()),
});

const UserChatMessageSchema = BaseChatMessageSchema.extend({
    type: z.literal(ChatMessageType.USER),
    role: z.literal(ChatMessageRole.USER),
    content: z.array(z.custom<TextBlock>()),
    toPreviousMessage: z.function().returns(z.custom<CoreUserMessage>()),
    toCurrentMessage: z.function().returns(z.custom<CoreUserMessage>()),
});

const AssistantChatMessageSchema = BaseChatMessageSchema.extend({
    type: z.literal(ChatMessageType.ASSISTANT),
    role: z.literal(ChatMessageRole.ASSISTANT),
    content: z.array(z.custom<AssistantContentBlock>()),
    toPreviousMessage: z.function().returns(z.custom<CoreAssistantMessage>()),
    toCurrentMessage: z.function().returns(z.custom<CoreAssistantMessage>()),
});

export const ChatMessageSchema = z.discriminatedUnion('type', [UserChatMessageSchema, AssistantChatMessageSchema]);

export type UserChatMessage = z.infer<typeof UserChatMessageSchema>;
export type AssistantChatMessage = z.infer<typeof AssistantChatMessageSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
