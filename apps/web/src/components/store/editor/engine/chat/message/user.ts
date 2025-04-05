import { PromptProvider } from '@onlook/ai/src/prompt/provider';
import type { ChatMessageContext } from '@onlook/models/chat';
import { ChatMessageRole, type UserChatMessage } from '@onlook/models/chat';
import type { CoreUserMessage, UserContent } from 'ai';
import { nanoid } from 'nanoid/non-secure';

export class UserChatMessageImpl implements UserChatMessage {
    id: string;
    role: ChatMessageRole.USER = ChatMessageRole.USER;
    content: UserContent;
    context: ChatMessageContext[] = [];
    promptProvider: PromptProvider;

    constructor(content: UserContent, context: ChatMessageContext[] = []) {
        this.id = nanoid();
        this.content = content;
        this.context = context;
        this.promptProvider = new PromptProvider();
    }

    static fromJSON(data: UserChatMessage): UserChatMessageImpl {
        const message = new UserChatMessageImpl(data.content, data.context);
        message.id = data.id;
        return message;
    }

    static toJSON(message: UserChatMessageImpl): UserChatMessage {
        return {
            id: message.id,
            role: message.role,
            content: message.content,
            context: message.context,
        };
    }

    static fromCoreMessage(message: CoreUserMessage): UserChatMessageImpl {
        return new UserChatMessageImpl(message.content);
    }

    static fromStringContent(
        content: string,
        context: ChatMessageContext[] = [],
    ): UserChatMessageImpl {
        const message = new UserChatMessageImpl([{ type: 'text', text: content }], context);
        return message;
    }

    toCoreMessage(): CoreUserMessage {
        return this.promptProvider.getHydratedUserMessage(this.content, this.context);
    }

    updateContent(content: UserContent) {
        this.content = content;
    }

    updateStringContent(content: string) {
        this.content = [
            {
                type: 'text',
                text: content,
            },
        ];
    }

    getStringContent(): string {
        if (typeof this.content === 'string') {
            return this.content;
        }
        return this.content.map((c) => (c.type === 'text' ? c.text : '')).join('');
    }
}
