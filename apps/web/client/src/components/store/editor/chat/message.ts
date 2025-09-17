import type { ChatMessage, MessageContext } from "@onlook/models";
import { v4 as uuidv4 } from 'uuid';

export const getUserChatMessageFromString = (
    content: string,
    context: MessageContext[],
    conversationId: string,
): ChatMessage => {
    return {
        id: uuidv4(),
        role: 'user',
        parts: [{ type: 'text', text: content }],
        metadata: {
            context,
            checkpoints: [],
            createdAt: new Date(),
            conversationId,
        },
    }
}