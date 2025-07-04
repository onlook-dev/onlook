import { getHydratedUserMessage } from '@onlook/ai/src/prompt/provider';
import type { ChatMessageContext } from '@onlook/models/chat';
import { ChatMessageRole, type UserChatMessage } from '@onlook/models/chat';
import type { Message, TextPart } from 'ai';
import { v4 as uuidv4 } from 'uuid';

export class UserChatMessageImpl implements UserChatMessage {
    id: string;
    role: ChatMessageRole.USER = ChatMessageRole.USER;
    content: string;
    context: ChatMessageContext[] = [];
    parts: TextPart[] = [];
    aiSdkId: string | undefined;
    commitOid: string | null;

    constructor(content: string, context: ChatMessageContext[] = []) {
        this.id = uuidv4();
        this.aiSdkId = undefined;
        this.content = content;
        this.parts = [{ type: 'text', text: content }];
        this.context = context;
        this.commitOid = null;
    }

    static fromJSON(data: UserChatMessage): UserChatMessageImpl {
        const message = new UserChatMessageImpl(data.content, data.context);
        message.id = data.id;
        message.commitOid = data.commitOid;
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

    static fromMessage(message: Message, context: ChatMessageContext[]): UserChatMessageImpl {
        return new UserChatMessageImpl(message.content, context);
    }

    static fromStringContent(content: string, context: ChatMessageContext[]): UserChatMessageImpl {
        return new UserChatMessageImpl(content, context);
    }

    toStreamMessage(): Message {
        return getHydratedUserMessage(this.id, this.content, this.context);
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
