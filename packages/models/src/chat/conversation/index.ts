import type { ChatSuggestion } from '../suggestion';
import type { ChatSummary } from '../summary';

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
    // Memory feature: rolling summary of conversation for context continuity
    summary: ChatSummary | null;
}
