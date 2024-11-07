import { ChatMessageType, type ChatConversation } from '@onlook/models/chat';
import type { CoreMessage } from 'ai';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import type { AssistantChatMessageImpl } from './message/assistant';
import type { UserChatMessageImpl } from './message/user';

export class ChatConversationImpl implements ChatConversation {
    id: string;
    displayName: string | undefined;
    messages: (UserChatMessageImpl | AssistantChatMessageImpl)[];
    createdAt: string;
    updatedAt: string;

    constructor(messages: (UserChatMessageImpl | AssistantChatMessageImpl)[]) {
        makeAutoObservable(this);
        this.id = nanoid();
        this.messages = messages;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    addMessage(message: UserChatMessageImpl | AssistantChatMessageImpl) {
        this.messages = [...this.messages, message];
        this.updatedAt = new Date().toISOString();
    }

    trimToMessage(message: UserChatMessageImpl | AssistantChatMessageImpl) {
        const index = this.messages.findIndex((m) => m.id === message.id);
        this.messages = this.messages.slice(0, index + 1);
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
            .filter((m) => m !== undefined && m.content !== '');
        return messages;
    }

    updateName(name: string, override = false) {
        if (override || !this.displayName) {
            this.displayName = name;
        }
    }

    getLastUserMessage() {
        return this.messages.findLast((message) => message.type === ChatMessageType.USER);
    }
}
