import { ChatMessageRole, type AssistantChatMessage, type ChatMessage, type ChatMessageContext, type MessageSnapshot, type SystemChatMessage, type UserChatMessage } from "@onlook/models";
import type { Message as DbMessage } from "../schema";

export const toMessage = (dbMessage: DbMessage): ChatMessage => {
    if (dbMessage.role === ChatMessageRole.ASSISTANT) {
        return {
            id: dbMessage.id,
            role: dbMessage.role,
            metadata: {
                createdAt: dbMessage.createdAt,
                snapshots: dbMessage.snapshots,
            },
            parts: dbMessage.parts,
        } satisfies AssistantChatMessage;
    } else if (dbMessage.role === ChatMessageRole.USER) {
        return {
            id: dbMessage.id,
            role: dbMessage.role,
            parts: dbMessage.parts,
            metadata: {
                createdAt: dbMessage.createdAt,
                snapshots: dbMessage.snapshots,
                context: dbMessage.context,
            }
        } satisfies UserChatMessage;
    } else {
        return {
            id: dbMessage.id,
            role: dbMessage.role as ChatMessageRole.SYSTEM,
            parts: dbMessage.parts,
            metadata: {
                createdAt: dbMessage.createdAt,
            }
        } satisfies SystemChatMessage;
    }
}

export const fromMessage = (conversationId: string, message: ChatMessage): DbMessage => {
    let snapshots: MessageSnapshot[] = [];
    let context: ChatMessageContext[] = [];

    if (message.role === ChatMessageRole.ASSISTANT) {
        snapshots = message.metadata?.snapshots ?? [];
    }

    if (message.role === ChatMessageRole.USER) {
        context = message.metadata?.context ?? [];
        snapshots = message.metadata?.snapshots ?? [];
    }

    return {
        id: message.id,
        role: message.role,
        createdAt: message.metadata?.createdAt ?? new Date(),
        conversationId,
        snapshots,
        context,
        parts: message.parts,
    }
}
