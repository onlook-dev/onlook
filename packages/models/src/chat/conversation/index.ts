import type { ChatSuggestion } from '../suggestion';

export type ChatConversation = {
    id: string;
    projectId: string;
    displayName: string | null;
    createdAt: string;
    updatedAt: string;
    suggestions: ChatSuggestion[];
};
