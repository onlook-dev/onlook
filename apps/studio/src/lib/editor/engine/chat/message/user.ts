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
