import type { ToolChatMessage } from '@onlook/models/chat';
import { ChatMessageRole } from '@onlook/models/chat';
import type { CoreToolMessage, ToolContent } from 'ai';
import { nanoid } from 'nanoid/non-secure';

export class ToolChatMessageImpl implements ToolChatMessage {
    id: string;
    role: ChatMessageRole.TOOL = ChatMessageRole.TOOL;
    content: ToolContent;

    constructor(content: ToolContent) {
        this.id = nanoid();
        this.content = content;
    }

    static fromJSON(data: ToolChatMessage): ToolChatMessageImpl {
        const message = new ToolChatMessageImpl(data.content);
        message.id = data.id;
        return message;
    }

    static toJSON(message: ToolChatMessageImpl): ToolChatMessage {
        return {
            id: message.id,
            role: message.role,
            content: message.content,
        };
    }

    static fromCoreMessage(message: CoreToolMessage): ToolChatMessageImpl {
        return new ToolChatMessageImpl(message.content);
    }

    toCoreMessage(): CoreToolMessage {
        return {
            ...this,
            content: this.content,
        };
    }
}
