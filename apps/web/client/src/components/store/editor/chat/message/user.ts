import { getHydratedUserMessage, type HydrateUserMessageOptions } from '@onlook/ai/src/prompt/provider';
import type { ChatMessageContext } from '@onlook/models/chat';
import { ChatMessageRole, type UserChatMessage } from '@onlook/models/chat';
import type { UIMessage } from 'ai';
import { v4 as uuidv4 } from 'uuid';

export class UserChatMessageImpl implements UserChatMessage {
    id: string;
    role: ChatMessageRole.USER = ChatMessageRole.USER;
    parts: UIMessage['parts'] = [];
    aiSdkId: string | undefined;

    constructor(parts: UIMessage['parts'], context: ChatMessageContext[] = []) {
        this.id = uuidv4();
        this.aiSdkId = undefined;
        this.parts = parts;
        this.context = context;
    }

    static fromJSON(data: UserChatMessage): UserChatMessageImpl {
        const message = new UserChatMessageImpl(data.parts, data.context);
        message.id = data.id;
        return message;
    }

    static toJSON(message: UserChatMessageImpl): UserChatMessage {
        return {
            id: message.id,
            role: message.role,
            context: message.context,
            parts: message.parts,
            content: message.content,
            commitOid: message.commitOid,
        };
    }

    static fromMessage(message: UIMessage, context: ChatMessageContext[]): UserChatMessageImpl {
        return new UserChatMessageImpl(message.content, context);
    }

    static fromStringContent(content: string, context: ChatMessageContext[]): UserChatMessageImpl {
        return new UserChatMessageImpl(content, context);
    }

    toStreamMessage(opt: HydrateUserMessageOptions): UIMessage {
        return getHydratedUserMessage(this.id, this.content, this.context, opt);
    }

    updateMessage(content: string, context: ChatMessageContext[]) {
        this.content = content;
        this.parts = [{ type: 'text', text: content }];
        this.context = context;
    }

    getStringContent(): string {
        return this.parts.map((part) => part.text).join('');
    }
}
