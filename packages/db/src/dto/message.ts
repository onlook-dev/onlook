import type { MastraMessageV2 } from "@mastra/core/memory";
import type { MessageSnapshot } from "@onlook/models";
import { ChatMessageRole, type AssistantChatMessage, type ChatMessage, type ChatMessageContext, type SystemChatMessage, type UserChatMessage } from "@onlook/models";
import type { Message as VercelMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';

export const toOnlookMessageFromMastra = (mastraMessage: MastraMessageV2): ChatMessage => {
    switch (mastraMessage.role) {
        case ChatMessageRole.ASSISTANT:
            return {
                ...mastraMessage,
                role: mastraMessage.role as ChatMessageRole.ASSISTANT,
                applied: false,
                snapshots: getMessageSnapshotsFromMastra(mastraMessage),
            } satisfies AssistantChatMessage;
        case ChatMessageRole.USER:
            // TODO: Format user message
            return {
                ...mastraMessage,
                role: mastraMessage.role as ChatMessageRole.USER,
                context: getMastraMessageContext(mastraMessage),
                snapshots: getMessageSnapshotsFromMastra(mastraMessage),
            } satisfies UserChatMessage;
        default:
            return {
                ...mastraMessage,
                role: mastraMessage.role as ChatMessageRole.SYSTEM,
            } satisfies SystemChatMessage;
    }
}

export const toMastraMessageFromOnlook = (message: ChatMessage): MastraMessageV2 => {
    return {
        ...message,
        role: message.role as MastraMessageV2['role'],
        content: getMastraMessageContentFromOnlook(message),
    } satisfies MastraMessageV2;
}

export const getMastraMessageContentFromOnlook = (message: ChatMessage): MastraMessageV2['content'] => {
    return {
        format: 2,
        parts: message.content.parts,
        metadata: {
            applied: false,
            snapshots: getMessageSnapshotsFromOnlook(message),
        }
    }
}

export const toOnlookMessageFromVercel = (message: VercelMessage): ChatMessage => {
    const baseMessage = {
        ...message,
        id: uuidv4(),
        vercelId: message.id,
        createdAt: message.createdAt ?? new Date(),
    }

    switch (message.role) {
        case ChatMessageRole.ASSISTANT:
            return {
                ...baseMessage,
                content: {
                    parts: message.parts ?? [],
                    format: 2,
                },
                role: message.role as ChatMessageRole.ASSISTANT,
                applied: false,
                snapshots: [],
            } satisfies AssistantChatMessage;
        case ChatMessageRole.USER:
            return {
                ...baseMessage,
                role: message.role as ChatMessageRole.USER,
                context: [],
                snapshots: [],
                content: {
                    parts: message.parts ?? [],
                    format: 2,
                },
            } satisfies UserChatMessage;
        default:
            return {
                ...baseMessage,
                role: message.role as ChatMessageRole.SYSTEM,
                content: {
                    parts: [],
                    format: 2,
                },
            } satisfies SystemChatMessage;
    }
}

export const toVercelMessageFromOnlook = (message: ChatMessage): VercelMessage => {
    return {
        ...message,
        content: message.content.parts.map((part) => {
            if (part.type === 'text') {
                return part.text;
            }
            return '';
        }).join(''),
    } satisfies VercelMessage;
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