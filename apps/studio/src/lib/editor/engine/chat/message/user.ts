import { PromptProvider } from '@onlook/ai/src/prompt/provider';
import type { ChatMessageContext, ImageMessageContext } from '@onlook/models/chat';
import {
    ChatMessageRole,
    MessageContextType,
    type UserChatContent,
    type UserChatMessage,
} from '@onlook/models/chat';
import type { CoreUserMessage, ImagePart, TextPart } from 'ai';
import { nanoid } from 'nanoid/non-secure';

export class UserChatMessageImpl implements UserChatMessage {
    id: string;
    role: ChatMessageRole.USER = ChatMessageRole.USER;
    content: UserChatContent;
    context: ChatMessageContext[] = [];
    promptProvider: PromptProvider;

    constructor(content: UserChatContent, context: ChatMessageContext[] = []) {
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

    toCoreMessage(): CoreUserMessage {
        return this.promptProvider.getHydratedUserMessage(this.content, this.context);
    }

    updateContent(content: UserChatContent) {
        this.content = content;
    }
}
