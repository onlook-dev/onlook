import type { ChatMessageContext, UserContentBlock } from '@onlook/models/chat';
import { ChatMessageRole, ChatMessageType, type UserChatMessage } from '@onlook/models/chat';
import type { CoreUserMessage } from 'ai';
import { nanoid } from 'nanoid';
import { getFormattedUserPrompt, getStrippedContext } from '../prompt';

export class UserChatMessageImpl implements UserChatMessage {
    id: string;
    type: ChatMessageType.USER = ChatMessageType.USER;
    role: ChatMessageRole.USER = ChatMessageRole.USER;
    content: UserContentBlock[];
    context: ChatMessageContext[] = [];

    constructor(content: string, context: ChatMessageContext[] = []) {
        this.id = nanoid();
        this.content = [{ type: 'text', text: content }];
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

    editContent(content: string) {
        this.content = [{ type: 'text', text: content }];
    }

    getStringContent(): string {
        return this.content.map((c) => c.text).join('\n');
    }

    toPreviousMessage(): CoreUserMessage {
        const strippedContext: ChatMessageContext[] = getStrippedContext(this.context);
        return {
            role: this.role,
            content: getFormattedUserPrompt(this.getStringContent(), strippedContext),
        };
    }

    toCurrentMessage(): CoreUserMessage {
        return {
            role: this.role,
            content: getFormattedUserPrompt(this.getStringContent(), this.context),
        };
    }
}
