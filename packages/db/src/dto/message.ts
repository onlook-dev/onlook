import type { Message as DbMessage } from "@onlook/db";
import { ChatMessageRole, type AssistantChatMessage, type ChatMessage, type UserChatMessage } from "@onlook/models";
import { assertNever } from '@onlook/utility';
import type { UIMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';

export const toMessage = (message: DbMessage): ChatMessage => {
    const content = {
        format: 2 as const,
        parts: message.parts ?? [],
        metadata: {
            vercelId: message.id,
            context: message.context ?? [],
            checkpoints: message.checkpoints ?? [],
        }
    }

    const baseMessage = {
        ...message,
        content,
        threadId: message.conversationId,
    }
    switch (message.role) {
        case ChatMessageRole.ASSISTANT:
            return {
                ...baseMessage,
                role: message.role as ChatMessageRole.ASSISTANT,
                content,
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
    return {
        id: message.id,
        createdAt: message.createdAt,
        conversationId: message.threadId,
        context: message.content.metadata?.context ?? [],
        parts: message.content.parts,
        content: message.content.parts.map((part) => {
            if (part.type === 'text') {
                return part.text;
            }
            return '';
        }).join(''),
        role: message.role as DbMessage['role'],
        checkpoints: message.content.metadata?.checkpoints ?? [],
        applied: null,
        commitOid: null,
        snapshots: null,
    } satisfies DbMessage;
}

export const toOnlookMessageFromVercel = (message: UIMessage, conversationId: string): ChatMessage => {
    const metadata = {
        vercelId: message.id,
        context: [],
        checkpoints: [],
    }
    const content = {
        parts: message.parts ?? [],
        format: 2 as const,
        metadata,
    }
    const baseMessage = {
        id: uuidv4(),
        threadId: conversationId,
        content,
    } as const;

    switch (message.role) {
        case 'assistant':
            return {
                ...baseMessage,
                role: ChatMessageRole.ASSISTANT,
                createdAt: new Date(),
            } satisfies AssistantChatMessage;
        case 'user':
            return {
                ...baseMessage,
                role: ChatMessageRole.USER,
                createdAt: new Date(),
            } satisfies UserChatMessage;
        default:
            throw new Error(`Unsupported message role: ${message.role as string}`);
    }
}

export const toDbMessageFromVercel = (message: UIMessage, conversationId: string): DbMessage => {
    return fromMessage(toOnlookMessageFromVercel(message, conversationId));
}
