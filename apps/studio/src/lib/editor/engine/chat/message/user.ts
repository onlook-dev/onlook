import type { ChatMessageContext } from '@onlook/models/chat';
import { ChatMessageRole, ChatMessageType, type UserChatMessage } from '@onlook/models/chat';
import type { CoreUserMessage } from 'ai';
import { nanoid } from 'nanoid/non-secure';

export class UserChatMessageImpl implements UserChatMessage {
    id: string;
    type: ChatMessageType.USER = ChatMessageType.USER;
    role: ChatMessageRole.USER = ChatMessageRole.USER;
    content: string;
    context: ChatMessageContext[] = [];

    constructor(content: string, context: ChatMessageContext[] = []) {
        this.id = nanoid();
        this.content = content;
        this.context = context;
    }

    static fromJSON(data: UserChatMessage): UserChatMessageImpl {
        const message = new UserChatMessageImpl('');
        message.id = data.id;
        message.content = data.content;
        message.context = data.context;
        return message;
    }

    static toJSON(message: UserChatMessageImpl): UserChatMessage {
        return {
            id: message.id,
            type: message.type,
            role: message.role,
            content: message.content,
            context: message.context,
        };
    }

    toCoreMessage(): CoreUserMessage {
        return {
            role: this.role,
            content: this.content,
        };
    }
}
