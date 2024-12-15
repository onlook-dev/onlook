import { type ChatMessage } from '../message';

export type ChatConversation = {
    id: string;
    projectId: string;
    displayName: string | null;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
};
