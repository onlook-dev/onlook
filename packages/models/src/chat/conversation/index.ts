import type { StorageThreadType } from '@mastra/core/memory';
import type { ChatSuggestion } from '../suggestion';

export interface ChatConversation extends StorageThreadType {
    projectId: string;
    metadata?: {
        suggestions: ChatSuggestion[];
    };
}
