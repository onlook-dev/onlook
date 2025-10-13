import type { Conversation as DbConversation } from "@onlook/db";
import { AgentType, type ChatSuggestion } from "@onlook/db/types/chat";

export type ChatConversation = {
    id: string;
    agentType: AgentType;
    title: string | null;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
    suggestions: ChatSuggestion[];
};

export const fromDbConversation = (conversation: DbConversation): ChatConversation => {
    return {
        ...conversation,
        title: conversation.displayName || null,
        agentType: conversation.agentType || AgentType.ROOT,
        suggestions: conversation.suggestions || [],
    }
}

export const toDbConversation = (conversation: ChatConversation): DbConversation => {
    return {
        ...conversation,
        projectId: conversation.projectId,
        displayName: conversation.title || null,
        agentType: conversation.agentType,
        suggestions: conversation.suggestions || [],
    }
}
