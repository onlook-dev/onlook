import type { Conversation as DbConversation } from "@onlook/db";
import { type ChatConversation } from "@onlook/models";

export const fromDbConversation = (conversation: DbConversation): ChatConversation => {
    return conversation;
}

export const toDbConversation = (conversation: ChatConversation): DbConversation => {
    return {
        ...conversation,
        projectId: conversation.projectId,
        displayName: conversation.displayName || null,
        suggestions: conversation.suggestions || null,
        parentConversationId: conversation.parentConversationId || null,
        parentMessageId: conversation.parentMessageId || null,
    }
}
