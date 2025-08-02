import { ChatMessageRole } from "@onlook/models";
import type { ChatMessageContext, UserChatMessage } from "@onlook/models/chat";
import { v4 as uuidv4 } from 'uuid';

export const getUserChatMessageFromString = (content: string, context: ChatMessageContext[]): UserChatMessage => {
    return {
        id: uuidv4(),
        role: ChatMessageRole.USER,
        content: {
            parts: [{ type: 'text', text: content }],
            format: 2
        },
        context,
        snapshots: [],
        createdAt: new Date(),
    }
}