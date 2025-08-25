import type { ChatSuggestion } from '../suggestion';

export interface ChatConversation {
    id: string;
    title?: string;
    createdAt: Date;
    updatedAt: Date;
    metadata?: {
        suggestions: ChatSuggestion[];
    };
}
