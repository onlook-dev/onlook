import type { ChatSuggestion } from '../suggestion';

export enum AgentType {
    ROOT = "root",
    USER = "user",
}

export interface ChatConversation {
    id: string;
    agentType: AgentType;
    title: string | null;
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
    suggestions: ChatSuggestion[];
}
