import { ChatMessageRole } from "@onlook/models";
import type { MessageContext, UserChatMessage } from "@onlook/models/chat";
import { v4 as uuidv4 } from 'uuid';

export const getUserChatMessageFromString = (
    content: string,
    context: MessageContext[],
    conversationId: string,
): UserChatMessage => {
    return {
        id: uuidv4(),
        role: ChatMessageRole.USER,
        parts: [{ type: 'text', text: content }],
        metadata: {
            context,
            checkpoints: [],
        },
        createdAt: new Date(),
        threadId: conversationId,
    }
}