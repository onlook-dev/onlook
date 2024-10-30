import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';
import { nanoid } from 'nanoid';
import { getFormattedUserPrompt, getStrippedContext } from '../prompt';
import { ChatMessageRole, ChatMessageType, type UserChatMessage } from '@onlook/models/chat';
import type { TextContentBlock } from '@onlook/models/chat';
import type { ChatMessageContext } from '@onlook/models/chat';

export class UserChatMessageImpl implements UserChatMessage {
    id: string;
    type: ChatMessageType.USER = ChatMessageType.USER;
    role: ChatMessageRole.USER = ChatMessageRole.USER;
    content: TextContentBlock[];
    context: ChatMessageContext[] = [];

    constructor(content: string, context: ChatMessageContext[] = []) {
        this.id = nanoid();
        this.content = [{ type: 'text', text: content }];
        this.context = context;
    }

    getStringContent(): string {
        return this.content.map((c) => c.text).join('\n');
    }

    toPreviousParam(): MessageParam {
        const strippedContext: ChatMessageContext[] = getStrippedContext(this.context);

        return {
            role: this.role,
            content: getFormattedUserPrompt(this.getStringContent(), strippedContext),
        };
    }

    toCurrentParam(): MessageParam {
        return {
            role: this.role,
            content: getFormattedUserPrompt(this.getStringContent(), this.context),
        };
    }
}
