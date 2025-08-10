import type { MastraMessageV2 } from "@mastra/core/memory";
import type { MessageSnapshot } from "@onlook/models";
import { ChatMessageRole, type AssistantChatMessage, type ChatMessage, type ChatMessageContext, type UserChatMessage } from "@onlook/models";
import { assertNever } from '@onlook/utility';
import type { Message as VercelMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';

export const toOnlookMessageFromMastra = (mastraMessage: MastraMessageV2): ChatMessage => {
    switch (mastraMessage.role) {
        case 'assistant':
            return {
                ...mastraMessage,
                role: mastraMessage.role as ChatMessageRole.ASSISTANT,
                content: {
                    format: 2,
                    parts: mastraMessage.content.parts,
                    metadata: {
                        vercelId: mastraMessage.id,
                        context: getMastraMessageContext(mastraMessage),
                        snapshots: getMessageSnapshotsFromMastra(mastraMessage),
                    }
                }
            } satisfies AssistantChatMessage;
        case 'user':
            return {
                ...mastraMessage,
                role: mastraMessage.role as ChatMessageRole.USER,
                content: {
                    format: 2,
                    parts: mastraMessage.content.parts,
                    metadata: {
                        vercelId: mastraMessage.id,
                        context: getMastraMessageContext(mastraMessage),
                        snapshots: getMessageSnapshotsFromMastra(mastraMessage),
                    }
                }
            } satisfies UserChatMessage;
        default:
            assertNever(mastraMessage.role);
    }
}

export const toMastraMessageFromOnlook = (message: ChatMessage): MastraMessageV2 => {
    return {
        ...message,
        role: message.role as MastraMessageV2['role'],
    } satisfies MastraMessageV2;
}

export const toOnlookMessageFromVercel = (message: VercelMessage): ChatMessage => {
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

export const getMastraMessageContext = (message: MastraMessageV2): ChatMessageContext[] => {
    return (message.content.metadata?.context ?? []) as ChatMessageContext[];
}

export const getMessageSnapshotsFromMastra = (message: MastraMessageV2): MessageSnapshot[] => {
    return (message.content.metadata?.snapshots ?? []) as MessageSnapshot[];
}

export const getMessageSnapshotsFromOnlook = (message: ChatMessage): MessageSnapshot[] => {
    return (message.content.metadata?.snapshots ?? []) as MessageSnapshot[];
}