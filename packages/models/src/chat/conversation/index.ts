import type { ChatMessage } from "../message";

export type ChatConversation = {
    id: string;
    displayName: string;
    messages: ChatMessage[];
    createdAt: string;
    updatedAt: string;
}