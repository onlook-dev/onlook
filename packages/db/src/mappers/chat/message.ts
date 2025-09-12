import type { Message as DbMessage, Part as DbPart } from "@onlook/db";
import { ChatMessageRole, type AssistantChatMessage, type ChatMessage, type UserChatMessage } from "@onlook/models";
import { assertNever } from '@onlook/utility';
import type { UIMessage as VercelMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';
import { fromDbParts, toDbParts } from './parts';

/**
 * Convert database message to ChatMessage (without parts - parts need to be loaded separately)
 */
export const fromDbMessage = (message: DbMessage): ChatMessage => {
    const baseMessage = {
        ...message,
        threadId: message.conversationId,
        metadata: {
            vercelId: message.id,
            context: message.context ?? [],
            checkpoints: message.checkpoints ?? [],
        },
        parts: [], // Parts will be loaded separately and merged

    }
    switch (message.role) {
        case ChatMessageRole.ASSISTANT:
            return {
                ...baseMessage,
                role: message.role as ChatMessageRole.ASSISTANT,
            } satisfies AssistantChatMessage;
        case ChatMessageRole.USER:
            return {
                ...baseMessage,
                role: message.role as ChatMessageRole.USER,
            } satisfies UserChatMessage;
        default:
            assertNever(message.role);
    }
}

/**
 * Convert database message with parts to ChatMessage
 */
export const fromDbMessageWithParts = (message: DbMessage, parts: DbPart[]): ChatMessage => {
    const baseMessage = fromDbMessage(message);
    baseMessage.parts = fromDbParts(parts);
    return baseMessage;
}

/**
 * Convert ChatMessage to database message (without parts - parts stored separately)
 */
export const toDbMessage = (message: ChatMessage): DbMessage => {
    return {
        id: message.id,
        createdAt: message.createdAt,
        conversationId: message.threadId,
        context: message?.metadata?.context ?? [],
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

/**
 * Get database parts from ChatMessage
 */
export const getDbPartsFromMessage = (message: ChatMessage) => {
    return toDbParts(message.parts, message.id);
}

export const toOnlookMessageFromVercel = (message: VercelMessage, conversationId: string): ChatMessage => {
    const metadata = {
        vercelId: message.id,
        context: [],
        checkpoints: [],
    }
    const baseMessage: ChatMessage = {
        ...message,
        id: uuidv4(),
        createdAt: new Date(),
        threadId: conversationId,
        metadata,
        parts: message.parts ?? [],
        role: message.role as ChatMessageRole,
    }
    return baseMessage;
}

export const toDbMessageFromVercel = (message: VercelMessage, conversationId: string): DbMessage => {
    return toDbMessage(toOnlookMessageFromVercel(message, conversationId));
}
