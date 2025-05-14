import { ChatMessageRole, type ChatConversation, type ChatMessage, type ChatMessageContext, type ChatSnapshot } from "@onlook/models";
import type { TextPart } from "ai";
import type { Conversation as DbConversation, Message as DbMessage } from "../schema";

export const toConversation = (dbConversation: DbConversation, messages: DbMessage[]): ChatConversation => {
    return {
        id: dbConversation.id,
        displayName: dbConversation.displayName,
        createdAt: dbConversation.createdAt.toISOString(),
        updatedAt: dbConversation.updatedAt.toISOString(),
        messages: sortMessages(messages.map(toMessage)),
        projectId: dbConversation.projectId,
    }
}

export const fromConversation = (conversation: ChatConversation): DbConversation => {
    return {
        id: conversation.id,
        displayName: conversation.displayName,
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
        projectId: conversation.projectId,
    }
}

export const toMessage = (dbMessage: DbMessage): ChatMessage => {
    if (dbMessage.role === ChatMessageRole.ASSISTANT) {
        return {
            id: dbMessage.id,
            content: dbMessage.content,
            role: dbMessage.role,
            createdAt: dbMessage.createdAt,
            applied: dbMessage.applied,
            snapshots: dbMessage.snapshots,
            parts: dbMessage.parts,
        }
    } else if (dbMessage.role === ChatMessageRole.USER) {
        return {
            id: dbMessage.id,
            content: dbMessage.content,
            role: dbMessage.role,
            createdAt: dbMessage.createdAt,
            context: dbMessage.context,
            parts: dbMessage.parts as TextPart[],
        }
    } else {
        return {
            id: dbMessage.id,
            content: dbMessage.content,
            role: dbMessage.role as ChatMessageRole.SYSTEM,
            createdAt: dbMessage.createdAt,
        }
    }
}

export const fromMessage = (conversationId: string, message: ChatMessage): DbMessage => {
    let snapshots: ChatSnapshot = {};
    let context: ChatMessageContext[] = [];

    if (message.role === ChatMessageRole.ASSISTANT) {
        snapshots = message.snapshots;
    }

    if (message.role === ChatMessageRole.USER) {
        context = message.context;
    }

    return {
        id: message.id,
        content: message.content,
        role: message.role,
        createdAt: message.createdAt ?? new Date(),
        conversationId,
        applied: message.role === ChatMessageRole.ASSISTANT ? message.applied ?? false : false,
        snapshots,
        context,
        parts: message.parts
    }
}

export const sortMessages = (messages: ChatMessage[]): ChatMessage[] => {
    return messages.toSorted((a, b) => (a.createdAt ?? new Date()).getTime() - (b.createdAt ?? new Date()).getTime());
}
