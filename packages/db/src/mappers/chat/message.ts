import type { Message as DbMessage, Part as DbPart } from "@onlook/db";
import { ChatMessageRole, type AssistantChatMessage, type ChatMessage, type UserChatMessage, type ChatUIMessage, type InternalChatMetadata } from "@onlook/models";
import { assertNever } from '@onlook/utility';
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
                role: message.role as typeof ChatMessageRole.ASSISTANT,
            } satisfies AssistantChatMessage;
        case ChatMessageRole.USER:
            return {
                ...baseMessage,
                role: message.role as typeof ChatMessageRole.USER,
            } satisfies UserChatMessage;
        case ChatMessageRole.SYSTEM:
            // System messages are not supported in our ChatMessage type
            throw new Error('System messages are not supported');
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
        parts: message.parts, // Keep parts for backwards compatibility during transition
    } satisfies DbMessage;
}

/**
 * Get database parts from ChatMessage
 */
export const getDbPartsFromMessage = (message: ChatMessage) => {
    return toDbParts(message.parts, message.id);
}

export const toOnlookMessageFromVercel = (message: { id: string; parts: ChatUIMessage['parts']; role: 'user' | 'assistant' | 'system'; metadata?: unknown }, conversationId: string): ChatMessage => {
    const metadata: InternalChatMetadata = {
        vercelId: message.id,
        context: [],
        checkpoints: [],
    }
    
    // Filter out system role messages as our ChatMessage doesn't support them
    if (message.role === 'system') {
        throw new Error('System messages are not supported in ChatMessage type');
    }
    
    const baseMessage: ChatMessage = {
        id: uuidv4(),
        createdAt: new Date(),
        threadId: conversationId,
        metadata,
        parts: message.parts ?? [],
        role: message.role,
    }
    return baseMessage;
}

export const toDbMessageFromVercel = (message: ChatUIMessage, conversationId: string): DbMessage => {
    return toDbMessage(toOnlookMessageFromVercel(message, conversationId));
}
