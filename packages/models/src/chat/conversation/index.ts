import { z } from 'zod';
import { ChatMessageSchema } from '../message';

export const ChatConversationSchema = z.object({
    id: z.string(),
    projectId: z.string(),
    displayName: z.string().nullable(),
    messages: z.array(ChatMessageSchema),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

export type ChatConversation = z.infer<typeof ChatConversationSchema>;
