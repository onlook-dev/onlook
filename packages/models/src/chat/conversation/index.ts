import type { StorageThreadType } from '@mastra/core/memory';

export interface ChatConversation extends StorageThreadType {
    projectId: string;
}
