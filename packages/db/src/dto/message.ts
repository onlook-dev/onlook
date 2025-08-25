import type { Message as DbMessage } from "@onlook/db";
import { ChatMessageRole, type AssistantChatMessage, type ChatMessage, type UserChatMessage } from "@onlook/models";
import { assertNever } from '@onlook/utility';
import type { UIMessage as VercelMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';

export const toMessage = (message: DbMessage): ChatMessage => {

    const baseMessage = {
        ...message,
        threadId: message.conversationId,
        metadata: {
            vercelId: message.id,
            context: message.context ?? [],
            checkpoints: message.checkpoints ?? [],
        },
        parts: message.parts ?? [],

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

export const fromMessage = (message: ChatMessage): DbMessage => {
    console.log('message', message);
    
    return {
        id: message.id,
        createdAt: message.createdAt,
        conversationId: message.threadId,
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

export const toOnlookMessageFromVercel = (message: VercelMessage, conversationId: string): ChatMessage => {
    const metadata = {
        vercelId: message.id,
        context: [],
        checkpoints: [],
    }
    const baseMessage = {
        ...message,
        id: uuidv4(),
        createdAt: (message as any).createdAt ?? new Date(),
        threadId: conversationId,
        metadata,
        parts: message.parts ?? [],
        content: message.parts.map((part) => {
            if (part.type === 'text') {
                return part.text;
            }
            return '';
        }).join(''),
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
            throw new Error(`Unsupported message role: ${message.role}`);
    }
}

export const toDbMessageFromVercel = (message: VercelMessage, conversationId: string): DbMessage => {
    console.log('toDbMessageFromVercel', message);
    return fromMessage(toOnlookMessageFromVercel(message, conversationId));
}
