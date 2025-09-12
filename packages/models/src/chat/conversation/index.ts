import type { ChatSuggestion } from '../suggestion';

export interface ChatConversation {
    id: string;
    displayName: string | null;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
    suggestions: ChatSuggestion[] | null;
    parentConversationId?: string | null;
    parentMessageId?: string | null;
}
