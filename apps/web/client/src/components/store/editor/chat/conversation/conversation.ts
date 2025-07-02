import { api } from '@/trpc/client';
import { MAX_NAME_LENGTH } from '@onlook/constants';
import { fromConversation, fromMessage } from '@onlook/db';
import {
    ChatMessageRole,
    type AssistantChatMessage,
    type ChatConversation,
    type UserChatMessage
} from '@onlook/models/chat';
import type { Message } from 'ai';
import { makeAutoObservable } from 'mobx';
import { AssistantChatMessageImpl } from '../message/assistant';
import { UserChatMessageImpl } from '../message/user';

export type ChatMessageImpl = UserChatMessageImpl | AssistantChatMessageImpl;

export class ChatConversationImpl implements ChatConversation {
    id: string;
    projectId: string;
    displayName: string | null = null;
    messages: ChatMessageImpl[] = [];
    createdAt: string;
    updatedAt: string;

    private constructor(conversation: ChatConversation, fetchMessages = false) {
        this.id = conversation.id;
        this.projectId = conversation.projectId;
        this.createdAt = conversation.createdAt;
        this.updatedAt = conversation.updatedAt;
        this.displayName = conversation.displayName;

        if (fetchMessages) {
            this.getMessagesFromStorage().then((messages) => {
                this.messages = messages;
            });
        }
        makeAutoObservable(this);
    }

    static fromJSON(conversation: ChatConversation) {
        return new ChatConversationImpl(conversation, true);
    }

    async getMessagesFromStorage(): Promise<ChatMessageImpl[]> {
        const messages = await api.chat.message.get.query({ conversationId: this.id });
        const messagesImpl = messages.map((m) => {
            if (m.role === ChatMessageRole.USER) {
                return UserChatMessageImpl.fromJSON(m as UserChatMessage);
            } else if (m.role === ChatMessageRole.ASSISTANT) {
                return AssistantChatMessageImpl.fromJSON(m as AssistantChatMessage);
            }
        }).filter((m) => m !== null) as ChatMessageImpl[];
        return messagesImpl;
    }

    getMessageById(id: string) {
        return this.messages.find((m) => m.id === id);
    }


    getMessagesForStream(): Message[] {
        return this.messages.map((m) => m.toStreamMessage());
    }

    async addOrUpdateMessage(message: ChatMessageImpl) {
        const index = this.messages.findIndex((m) => m.id === message.id || (m.aiSdkId && m.aiSdkId === message.aiSdkId));
        if (index !== -1) {
            this.messages[index] = message;
        } else {
            this.messages = [...this.messages, message];
        }
        this.updatedAt = new Date().toISOString();
        await this.saveMessageToStorage(message);
    }

    async removeAllMessagesAfter(message: ChatMessageImpl) {
        const index = this.messages.findIndex((m) => m.id === message.id);
        if (index === -1) {
            console.error('Message not found');
            return;
        }
        const removedMessages = this.messages.slice(index + 1);
        await this.removeMessagesFromStorage(removedMessages);

        this.messages = this.messages.slice(0, index + 1);
        this.updatedAt = new Date().toISOString();
    }

    updateName(name: string, override = false) {
        if (override || !this.displayName) {
            this.displayName = name.slice(0, MAX_NAME_LENGTH);
        }
    }

    getLastUserMessage() {
        return this.messages.findLast((message) => message.role === ChatMessageRole.USER);
    }

    updateMessage(message: ChatMessageImpl) {
        const index = this.messages.findIndex((m) => m.id === message.id);
        if (index === -1) {
            console.error('Message not found');
            return;
        }
        this.messages[index] = message;
        this.updatedAt = new Date().toISOString();
        this.messages = [...this.messages];
        this.saveMessageToStorage(message);
    }

    async saveConversationToStorage() {
        const success = await api.chat.conversation.upsert.mutate({
            conversation: fromConversation(this),
        });
        if (!success) {
            console.error('Failed to save conversation to storage', this);
        }
        return success;
    }

    async saveMessageToStorage(message: ChatMessageImpl) {
        const success = await api.chat.message.upsert.mutate({
            message: fromMessage(this.id, message),
        });
        if (!success) {
            console.error('Failed to save message to storage', message);
        }
    }

    async removeMessagesFromStorage(messages: ChatMessageImpl[]) {
        const success = await api.chat.message.delete.mutate({
            messageIds: messages.map((m) => m.id),
        });
        if (!success) {
            console.error('Failed to delete messages from storage', messages);
        }
    }
}
