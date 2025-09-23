import type { Message as DbMessage } from "@onlook/db";
import { type ChatMessage } from "@onlook/models";

export const fromDbMessage = (message: DbMessage): ChatMessage => {
    return {
        ...message,
        metadata: {
            conversationId: message.conversationId,
            createdAt: message.createdAt,
            context: message.context ?? [],
            checkpoints: message.checkpoints ?? [],
            usage: message.usage ?? undefined,
        },
        parts: message.parts ?? [],
    }
}

export const toDbMessage = (message: ChatMessage, conversationId: string): DbMessage => {
    const createdAt = message.metadata?.createdAt;
    return {
        id: message.id,
        createdAt: createdAt instanceof Date ? createdAt : createdAt ? new Date(createdAt) : new Date(),
        conversationId,
        context: message?.metadata?.context ?? [],
        parts: message.parts,
        role: message.role,
        checkpoints: message.metadata?.checkpoints ?? [],
        usage: message.metadata?.usage ?? null,

        // deprecated
        applied: null,
        commitOid: null,
        snapshots: null,
        content: '',
    }
}
