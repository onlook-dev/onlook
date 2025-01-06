import type { PromptProvider } from '@onlook/ai/src/prompt/provider';
import { PromptProvider as PromptProviderImpl } from '@onlook/ai/src/prompt/provider';
import type { ChatMessageContext } from '@onlook/models/chat';
import {
    ChatMessageRole,
    ChatMessageType,
    MessageContextType,
    type UserChatMessage,
} from '@onlook/models/chat';
import type { CoreUserMessage } from 'ai';
import type { UserContent } from '@onlook/models/chat/message';
import { nanoid } from 'nanoid/non-secure';

export class UserChatMessageImpl implements UserChatMessage {
    id: string;
    type: ChatMessageType.USER = ChatMessageType.USER;
    role: ChatMessageRole.USER = ChatMessageRole.USER;
    content: string;
    context: ChatMessageContext[] = [];
    promptProvider: PromptProvider;

    // Extra behavior parameters
    hydratedContent: UserContent;

    constructor(content: string, context: ChatMessageContext[] = []) {
        this.id = nanoid();
        this.content = content;
        this.context = context;
        this.promptProvider = new PromptProviderImpl();
        this.hydratedContent = this.createHydratedContent() as UserContent;
    }

    static fromJSON(data: UserChatMessage): UserChatMessageImpl {
        const message = new UserChatMessageImpl(data.content, data.context);
        message.id = data.id;
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

    createHydratedContent(): UserContent {
        return this.promptProvider.getUserMessage(this.content, {
            files: this.context.filter((c) => c.type === MessageContextType.FILE),
            highlights: this.context.filter((c) => c.type === MessageContextType.HIGHLIGHT),
            images: this.context.filter((c) => c.type === MessageContextType.IMAGE),
        });
    }

    toCoreMessage(): CoreUserMessage {
        return {
            role: this.role,
            content: Array.isArray(this.hydratedContent)
                ? this.hydratedContent
                : [{ type: 'text', text: this.hydratedContent }],
        };
    }
}
