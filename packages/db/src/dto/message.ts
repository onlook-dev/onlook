import type { MastraMessageV2 } from "@mastra/core/memory";
import { ChatMessageRole, type AssistantChatMessage, type ChatMessage, type ChatMessageContext, type SystemChatMessage, type UserChatMessage } from "@onlook/models";
import type { Message as VercelMessage } from 'ai';
import type { MessageSnapshot } from "../../../models/src/chat/message/snapshot";

export const toOnlookMessageFromMastra = (mastraMessage: MastraMessageV2): ChatMessage => {
    switch (mastraMessage.role) {
        case ChatMessageRole.ASSISTANT:
            return {
                ...mastraMessage,
                role: mastraMessage.role as ChatMessageRole.ASSISTANT,
                applied: false,
                snapshots: getMastraMessageOids(mastraMessage),
            } satisfies AssistantChatMessage;
        case ChatMessageRole.USER:
            return {
                ...mastraMessage,
                role: mastraMessage.role as ChatMessageRole.USER,
                // TODO: handle this
                context: getMastraMessageContext(mastraMessage),
                snapshots: getMastraMessageOids(mastraMessage),
            } satisfies UserChatMessage;
        default:
            return {
                ...mastraMessage,
                role: mastraMessage.role as ChatMessageRole.SYSTEM,
            } satisfies SystemChatMessage;
    }
}

export const toOnlookMessageFromVercel = (message: VercelMessage): ChatMessage => {
    switch (message.role) {
        case ChatMessageRole.ASSISTANT:
            return {
                ...message,
                role: message.role as ChatMessageRole.ASSISTANT,
                applied: false,
                snapshots: [],
                content: {
                    parts: message.parts ?? [],
                    format: 2,
                },
                createdAt: message.createdAt ?? new Date(),
            } satisfies AssistantChatMessage;
        case ChatMessageRole.USER:
            return {
                ...message,
                role: message.role as ChatMessageRole.USER,
                context: [],
                snapshots: [],
                content: {
                    parts: message.parts ?? [],
                    format: 2,
                },
                createdAt: message.createdAt ?? new Date(),
            } satisfies UserChatMessage;
        default:
            return {
                ...message,
                role: message.role as ChatMessageRole.SYSTEM,
                content: {
                    parts: [],
                    format: 2,
                },
                createdAt: message.createdAt ?? new Date(),
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

export const getMastraMessageOids = (message: MastraMessageV2): MessageSnapshot[] => {
    return (message.content.metadata?.snapshots ?? []) as MessageSnapshot[];
}