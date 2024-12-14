import { type AssistantChatMessage, ChatMessageRole, ChatMessageType } from '@onlook/models/chat';
import type { CoreAssistantMessage } from 'ai';
import { nanoid } from 'nanoid/non-secure';

export class AssistantChatMessageImpl implements AssistantChatMessage {
    id: string;
    type: ChatMessageType.ASSISTANT = ChatMessageType.ASSISTANT;
    role: ChatMessageRole.ASSISTANT = ChatMessageRole.ASSISTANT;
    content: string;

    // Apply code behavior
    applied: boolean = false;

    constructor(content: string) {
        this.id = nanoid();
        this.content = content;
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
        return message;
    }

    static toJSON(message: AssistantChatMessageImpl): AssistantChatMessage {
        return {
            id: message.id,
            type: message.type,
            role: message.role,
            content: message.content,
        };
    }
}
