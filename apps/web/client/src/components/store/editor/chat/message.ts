import { ChatMessageRole } from "@onlook/models";
import type { ChatMessageContext, UserChatMessage } from "@onlook/models/chat";
import { v4 as uuidv4 } from 'uuid';

export const getUserChatMessageFromString = (
    content: string,
    context: ChatMessageContext[],
    conversationId: string,
): UserChatMessage => {
    return {
        id: uuidv4(),
        role: ChatMessageRole.USER,
        content: {
            parts: [{ type: 'text', text: content }],
            format: 2,
            metadata: {
                context,
                snapshots: [],
            }
        },
        createdAt: new Date(),
        threadId: conversationId,
    }
}