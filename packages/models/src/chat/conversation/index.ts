import type { ChatSuggestion } from '../suggestion';

export interface ChatConversation {
    id: string;
    title?: string;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
    metadata?: {
        suggestions: ChatSuggestion[];
    };

    // Subchat support
    parentConversationId?: string;
    parentMessageId?: string;
}

export interface ChatConversationWithSubchats extends ChatConversation {
    subchats: ChatConversation[];
}

export interface ChatConversationTree extends ChatConversation {
    subchats: ChatConversationTree[];
}
