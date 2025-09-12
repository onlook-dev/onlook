import type { Message as DbMessage } from "@onlook/db";
import { ChatMessageRole, type ChatMessage } from "@onlook/models";
import { assertNever } from '@onlook/utility';
import { v4 as uuidv4 } from 'uuid';

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

export const toDbMessage = (message: ChatMessage): DbMessage => {
    return {
        id: message.id,
        createdAt: message.createdAt,
        conversationId: message.conversationId,
        context: message?.metadata?.context ?? [],
        parts: message.parts,
        content: message.parts.map((part) => {
            if (part.type === 'text') {
                return part.text;
            }
            return '';
        }).join(''),
        role: message.role as DbMessage['role'],
        checkpoints: message.metadata?.checkpoints ?? [],
        applied: null,
        commitOid: null,
        snapshots: null,
    } satisfies DbMessage;
}
