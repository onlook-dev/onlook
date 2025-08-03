import { type AssistantChatMessage, ChatMessageRole } from '@onlook/models/chat';
import type { UIMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';

export class AssistantChatMessageImpl implements AssistantChatMessage {
    id: string;
    role: ChatMessageRole.ASSISTANT = ChatMessageRole.ASSISTANT;
    parts: UIMessage['parts'] = [];
    aiSdkId: string | undefined;

    private constructor(message: UIMessage) {
        this.id = uuidv4();
        this.aiSdkId = message.id;
        this.parts = message.parts;
    }

    static fromMessage(message: UIMessage): AssistantChatMessageImpl {
        return new AssistantChatMessageImpl(message);
    }

    toStreamMessage(): UIMessage {
        return {
            ...this,
            parts: this.parts,
        };
    }

    static fromJSON(data: AssistantChatMessage): AssistantChatMessageImpl {
        const message = new AssistantChatMessageImpl(data);
        message.id = data.id;
        return message;
    }

    static toJSON(message: AssistantChatMessageImpl): AssistantChatMessage {
        return {
            id: message.id,
            role: message.role,
            parts: message.parts,
        };
    }
}
