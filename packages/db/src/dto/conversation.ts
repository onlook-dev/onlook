import { type ChatConversation } from "@onlook/models";
import type { Conversation as DbConversation } from "../schema";

export const toConversation = (dbConversation: DbConversation): ChatConversation => {
    return {
        id: dbConversation.id,
        displayName: dbConversation.displayName,
        createdAt: dbConversation.createdAt.toISOString(),
        updatedAt: dbConversation.updatedAt.toISOString(),
        projectId: dbConversation.projectId,
    }
}

export const fromConversation = (conversation: ChatConversation): DbConversation => {
    return {
        id: conversation.id,
        displayName: conversation.displayName,
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
        projectId: conversation.projectId,
    }
}
