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
}
