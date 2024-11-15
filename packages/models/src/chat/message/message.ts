import { z } from 'zod';
import { AssistantContentBlockSchema, TextBlockSchema } from './content';
import { ChatMessageContextSchema } from './context';

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
});

const UserChatMessageSchema = BaseChatMessageSchema.extend({
    type: z.literal(ChatMessageType.USER),
    role: z.literal(ChatMessageRole.USER),
    content: z.array(TextBlockSchema),
    context: z.array(ChatMessageContextSchema),
});

const AssistantChatMessageSchema = BaseChatMessageSchema.extend({
    type: z.literal(ChatMessageType.ASSISTANT),
    role: z.literal(ChatMessageRole.ASSISTANT),
    content: z.array(AssistantContentBlockSchema),
});

export const ChatMessageSchema = z.discriminatedUnion('type', [UserChatMessageSchema, AssistantChatMessageSchema]);

export type UserChatMessage = z.infer<typeof UserChatMessageSchema>;
export type AssistantChatMessage = z.infer<typeof AssistantChatMessageSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
