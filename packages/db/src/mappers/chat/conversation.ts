import type { Conversation as DbConversation } from "@onlook/db";
import { type ChatConversation } from "@onlook/models";

export const fromDbConversation = (conversation: DbConversation): ChatConversation => {
    return {
        ...conversation,
        metadata: {
            suggestions: conversation.suggestions || [],
        }
    }
}

export const toDbConversation = (conversation: ChatConversation): DbConversation => {
    return {
        ...conversation,
        projectId: conversation.projectId,
        displayName: conversation.title || null,
        suggestions: conversation.metadata?.suggestions || [],
    }
}
