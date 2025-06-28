import { ChatMessageRole, type ChatMessage, type ChatMessageContext, type ChatSnapshot } from "@onlook/models";
import type { TextPart } from "ai";
import type { Message as DbMessage } from "../schema";

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
            commitOid: dbMessage.commitOid ?? null,
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
    let commitOid: string | null = null;

    if (message.role === ChatMessageRole.ASSISTANT) {
        snapshots = message.snapshots;
    }

    if (message.role === ChatMessageRole.USER) {
        context = message.context;
        commitOid = message.commitOid;
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
        parts: message.parts,
        commitOid,
    }
}
