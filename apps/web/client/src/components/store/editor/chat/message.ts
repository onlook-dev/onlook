import { type ChatMessage, type MessageContext } from "@onlook/models/chat";
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
            createdAt: new Date(),
            conversationId,
            context,
            checkpoints: [],
        },
    }
}