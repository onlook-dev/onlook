import { ChatMessageType, type ChatConversation } from '@onlook/models/chat';
import type { CoreMessage } from 'ai';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import type { AssistantChatMessageImpl } from './message/assistant';
import type { UserChatMessageImpl } from './message/user';

export class ChatConversationImpl implements ChatConversation {
    id: string;
    displayName: string;
    messages: (UserChatMessageImpl | AssistantChatMessageImpl)[];
    createdAt: string;
    updatedAt: string;

    constructor(name: string, messages: (UserChatMessageImpl | AssistantChatMessageImpl)[]) {
        makeAutoObservable(this);
        this.id = nanoid();
        this.displayName = name;
        this.messages = messages;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    addMessage(message: UserChatMessageImpl | AssistantChatMessageImpl) {
        this.messages = [...this.messages, message];
        this.updatedAt = new Date().toISOString();
    }

    getCoreMessages() {
        const messages: CoreMessage[] = this.messages
            .map((m, index) => {
                if (index === this.messages.length - 1) {
                    return m.toCurrentMessage();
                } else {
                    return m.toPreviousMessage();
                }
            })
            .filter((m) => m !== undefined);
        return messages;
    }

    getLastUserMessage() {
        return this.messages.findLast((message) => message.type === ChatMessageType.USER);
    }
}
