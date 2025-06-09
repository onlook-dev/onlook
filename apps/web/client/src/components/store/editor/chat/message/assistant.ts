import { type AssistantChatMessage, ChatMessageRole } from '@onlook/models/chat';
import type { CodeDiff } from '@onlook/models/code';
import type { Message } from 'ai';
import { v4 as uuidv4 } from 'uuid';

export class AssistantChatMessageImpl implements AssistantChatMessage {
    id: string;
    role: ChatMessageRole.ASSISTANT = ChatMessageRole.ASSISTANT;
    content: string;
    applied: boolean = false;
    snapshots: Record<string, CodeDiff> = {};
    parts: Message['parts'] = [];
    aiSdkId: string | undefined;

    private constructor(message: Message) {
        this.id = uuidv4();
        this.aiSdkId = message.id;
        this.content = message.content;
        this.parts = message.parts;
    }

    static fromMessage(message: Message): AssistantChatMessageImpl {
        return new AssistantChatMessageImpl(message);
    }

    toStreamMessage(): Message {
        return {
            ...this,
            content: this.content,
            parts: this.parts,
        };
    }

    static fromJSON(data: AssistantChatMessage): AssistantChatMessageImpl {
        const message = new AssistantChatMessageImpl(data);
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
            parts: message.parts,
        };
    }
}
