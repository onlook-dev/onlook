import { type AssistantChatMessage, ChatMessageRole } from '@onlook/models/chat';
import type { CodeDiff } from '@onlook/models/code';
import type { AssistantContent, CoreAssistantMessage } from 'ai';
import { nanoid } from 'nanoid/non-secure';

export class AssistantChatMessageImpl implements AssistantChatMessage {
    id: string;
    role: ChatMessageRole.ASSISTANT = ChatMessageRole.ASSISTANT;
    content: AssistantContent;
    applied: boolean = false;
    snapshots: Record<string, CodeDiff> = {};
    isStream: boolean;

    constructor(content: AssistantContent, isStream: boolean = false) {
        this.id = nanoid();
        this.content = content;
        this.isStream = isStream;
    }

    toCoreMessage(): CoreAssistantMessage {
        return {
            role: this.role,
            content: this.content,
        };
    }

    static fromJSON(data: AssistantChatMessage): AssistantChatMessageImpl {
        const message = new AssistantChatMessageImpl(data.content);
        message.id = data.id;
        message.applied = data.applied;
        message.snapshots = data.snapshots || {};
        return message;
    }

    static toJSON(message: AssistantChatMessageImpl): AssistantChatMessage {
        return {
            id: message.id,
            type: message.type,
            role: message.role,
            content: message.content,
            applied: message.applied,
            snapshots: message.snapshots,
        };
    }
}
