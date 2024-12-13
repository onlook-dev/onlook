import { PromptProvider } from '@onlook/ai/src/prompt/provider';
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
    hydratedContent: string;
    promptProvider: PromptProvider;

    constructor(content: string, context: ChatMessageContext[] = []) {
        this.id = nanoid();
        this.content = content;
        this.context = context;
        this.hydratedContent = content;
        this.promptProvider = new PromptProvider();
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

    createHydratedContent() {
        // TODO: Use prompt to create hydrated content
        this.hydratedContent = this.promptProvider.getUserMessage(this.content, {
            files: this.context.filter((c) => c.type === 'file'),
            highlights: this.context.filter((c) => c.type === 'highlight'),
        });
    }

    toCoreMessage(): CoreUserMessage {
        return {
            role: this.role,
            content: this.content,
        };
    }
}
