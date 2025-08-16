import type { Conversation as DbConversation } from "@onlook/db";
import { type ChatConversation } from "@onlook/models";

export const toConversation = (conversation: DbConversation): ChatConversation => {
    return {
        ...conversation,
        resourceId: conversation.projectId,
        metadata: {
            suggestions: conversation.suggestions || [],
        }
    }
}

export const fromConversationToDb = (conversation: ChatConversation): DbConversation => {
    return {
        ...conversation,
        projectId: conversation.resourceId,
        displayName: conversation.title || null,
        suggestions: conversation.metadata?.suggestions || [],
    }
}
