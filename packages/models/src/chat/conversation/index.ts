import type { ChatSuggestion } from '../suggestion';

export interface ChatConversation {
    id: string;
    title: string | null;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
    suggestions: ChatSuggestion[];
}
