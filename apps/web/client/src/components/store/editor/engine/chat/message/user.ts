import { PromptProvider } from '@onlook/ai/src/prompt/provider';
import type { ChatMessageContext } from '@onlook/models/chat';
import { ChatMessageRole, type UserChatMessage } from '@onlook/models/chat';
import type { Message } from 'ai';
import { nanoid } from 'nanoid/non-secure';

export class UserChatMessageImpl implements UserChatMessage {
    id: string;
    role: ChatMessageRole.USER = ChatMessageRole.USER;
    content: string;
    context: ChatMessageContext[] = [];
    promptProvider: PromptProvider;

    constructor(content: string, context: ChatMessageContext[] = []) {
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

    static fromMessage(message: Message, context: ChatMessageContext[]): UserChatMessageImpl {
        return new UserChatMessageImpl(message.content, context);
    }

    static fromStringContent(
        content: string,
        context: ChatMessageContext[]
    ): UserChatMessageImpl {
        return new UserChatMessageImpl(content, context);
    }

    toStreamMessage(): Message {
        return this.promptProvider.getHydratedUserMessage(this.id, this.content, this.context);
    }

    updateContent(content: string) {
        this.content = content;
    }

    getStringContent(): string {
        return this.content;
    }
}
