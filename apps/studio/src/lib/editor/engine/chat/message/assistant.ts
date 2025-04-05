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

    constructor(content: AssistantContent) {
        this.id = nanoid();
        this.content = content;
    }

    static fromCoreMessage(message: CoreAssistantMessage): AssistantChatMessageImpl {
        return new AssistantChatMessageImpl(message.content);
    }

    toCoreMessage(): CoreAssistantMessage {
        return {
            ...this,
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
            role: message.role,
            content: message.content,
            applied: message.applied,
            snapshots: message.snapshots,
        };
    }
}
