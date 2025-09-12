import type { Message as DbMessage } from "@onlook/db";
import { type ChatMessage } from "@onlook/models";

export const fromDbMessage = (message: DbMessage): ChatMessage => {
    return {
        ...message,
        metadata: {
            conversationId: message.conversationId,
            createdAt: message.createdAt,
            vercelId: message.id,
            context: message.context ?? [],
            checkpoints: message.checkpoints ?? [],
        },
        parts: message.parts ?? [],
    }
}

export const toDbMessage = (message: ChatMessage, conversationId: string): DbMessage => {
    return {
        id: message.id,
        createdAt: message.metadata?.createdAt ?? new Date(),
        conversationId,
        context: message?.metadata?.context ?? [],
        parts: message.parts,
        role: message.role,
        checkpoints: message.metadata?.checkpoints ?? [],

        // deprecated
        applied: null,
        commitOid: null,
        snapshots: null,
        content: null,
    }
}
