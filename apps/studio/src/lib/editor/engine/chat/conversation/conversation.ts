import { ChatMessageType, type ChatConversation } from '@onlook/models/chat';
import { MAX_NAME_LENGTH } from '@onlook/models/constants';
import type { CoreMessage } from 'ai';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import { AssistantChatMessageImpl } from '../message/assistant';
import { UserChatMessageImpl } from '../message/user';

export class ChatConversationImpl implements ChatConversation {
    id: string;
    projectId: string;
    displayName: string | null = null;
    messages: (UserChatMessageImpl | AssistantChatMessageImpl)[];
    createdAt: string;
    updatedAt: string;

    constructor(projectId: string, messages: (UserChatMessageImpl | AssistantChatMessageImpl)[]) {
        makeAutoObservable(this);
        this.id = nanoid();
        this.projectId = projectId;
        this.messages = messages;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    getMessageById(id: string) {
        return this.messages.find((m) => m.id === id);
    }

    static fromJSON(data: ChatConversation) {
        const conversation = new ChatConversationImpl(data.projectId, []);
        conversation.id = data.id;
        conversation.displayName = data.displayName;
        conversation.messages = data.messages.map((m) => {
            if (m.type === ChatMessageType.USER) {
                return UserChatMessageImpl.fromJSON(m);
            } else {
                return AssistantChatMessageImpl.fromJSON(m);
            }
        });
        conversation.createdAt = data.createdAt;
        conversation.updatedAt = data.updatedAt;
        return conversation;
    }

    getMessagesForStream(): CoreMessage[] {
        return this.messages.map((m) => m.toCoreMessage());
    }

    appendMessage(message: UserChatMessageImpl | AssistantChatMessageImpl) {
        this.messages = [...this.messages, message];
        this.updatedAt = new Date().toISOString();
    }

    removeAllMessagesAfter(message: UserChatMessageImpl | AssistantChatMessageImpl) {
        const index = this.messages.findIndex((m) => m.id === message.id);
        this.messages = this.messages.slice(0, index + 1);
        this.updatedAt = new Date().toISOString();
    }

    updateName(name: string, override = false) {
        if (override || !this.displayName) {
            this.displayName = name.slice(0, MAX_NAME_LENGTH);
        }
    }

    getLastUserMessage() {
        return this.messages.findLast((message) => message.type === ChatMessageType.USER);
    }

    updateMessage(message: UserChatMessageImpl | AssistantChatMessageImpl) {
        const index = this.messages.findIndex((m) => m.id === message.id);
        this.messages[index] = message;
        this.updatedAt = new Date().toISOString();
        this.messages = [...this.messages];
    }

    updateCodeReverted(id: string) {
        this.messages = [...this.messages];
    }
}
