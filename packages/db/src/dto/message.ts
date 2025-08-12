import type { MastraMessageV2 } from "@mastra/core/memory";
import type { Message as DbMessage } from "@onlook/db";
import type { MessageSnapshot } from "@onlook/models";
import { ChatMessageRole, type AssistantChatMessage, type ChatMessage, type ChatMessageContext, type UserChatMessage } from "@onlook/models";
import { assertNever } from '@onlook/utility';
import type { Message as VercelMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';

export const toMessage = (message: DbMessage): ChatMessage => {
    const content = {
        format: 2 as const,
        parts: message.parts ?? [],
        metadata: {
            vercelId: message.id,
            context: message.context ?? [],
            snapshots: message.snapshots ?? [],
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
        snapshots: message.content.metadata?.snapshots ?? [],
        applied: null,
        commitOid: null,
    } satisfies DbMessage;
}

export const toOnlookMessageFromVercel = (message: VercelMessage, conversationId: string): ChatMessage => {
    const metadata = {
        vercelId: message.id,
        context: [],
        snapshots: [],
    }
    const content = {
        parts: message.parts ?? [],
        format: 2 as const,
        metadata,
    }
    const baseMessage = {
        ...message,
        id: uuidv4(),
        createdAt: message.createdAt ?? new Date(),
        threadId: conversationId,
        content,
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
    return fromMessage(toOnlookMessageFromVercel(message, conversationId));
}

export const getMastraMessageContext = (message: MastraMessageV2): ChatMessageContext[] => {
    return (message.content.metadata?.context ?? []) as ChatMessageContext[];
}

export const getMessageSnapshotsFromMastra = (message: MastraMessageV2): MessageSnapshot[] => {
    return (message.content.metadata?.snapshots ?? []) as MessageSnapshot[];
}

export const getMessageSnapshotsFromOnlook = (message: ChatMessage): MessageSnapshot[] => {
    return (message.content.metadata?.snapshots ?? []) as MessageSnapshot[];
}