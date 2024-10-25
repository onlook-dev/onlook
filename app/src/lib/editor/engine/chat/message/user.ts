import { MessageParam } from '@anthropic-ai/sdk/resources';
import { nanoid } from 'nanoid';
import { getFormattedUserPrompt, getStrippedContext } from '../prompt';
import { ChatMessageRole, ChatMessageType, UserChatMessage } from '/common/models/chat/message';
import { TextContentBlock } from '/common/models/chat/message/content';
import { ChatMessageContext } from '/common/models/chat/message/context';

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
