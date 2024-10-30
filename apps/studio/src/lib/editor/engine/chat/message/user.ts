import { CoreUserMessage } from 'ai';
import { nanoid } from 'nanoid';
import { getFormattedUserPrompt, getStrippedContext } from '../prompt';
import {
    ChatMessageRole,
    ChatMessageType,
    type UserChatMessage,
} from '/common/models/chat/message';
import type { UserContentBlock } from '/common/models/chat/message/content';
import type { ChatMessageContext } from '/common/models/chat/message/context';

export class UserChatMessageImpl implements UserChatMessage {
    id: string;
    type: ChatMessageType.USER = ChatMessageType.USER;
    role: ChatMessageRole.USER = ChatMessageRole.USER;
    content: UserContentBlock[];
    context: ChatMessageContext[] = [];

    constructor(content: string, context: ChatMessageContext[] = []) {
        this.id = nanoid();
        this.content = [{ type: 'text', value: content }];
        this.context = context;
    }

    getStringContent(): string {
        return this.content.map((c) => c.value).join('\n');
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
