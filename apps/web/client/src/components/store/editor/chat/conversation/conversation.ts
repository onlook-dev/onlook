import { api } from '@/trpc/client';
import { MAX_NAME_LENGTH } from '@onlook/constants';
import { fromMessage } from '@onlook/db';
import {
    ChatMessageRole,
    type AssistantChatMessage,
    type ChatConversation,
    type TokenUsage,
    type UserChatMessage,
} from '@onlook/models/chat';
import type { Message } from 'ai';
import { makeAutoObservable } from 'mobx';
import { v4 as uuidv4 } from 'uuid';
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

    public tokenUsage: TokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
    };

    constructor(projectId: string, messages: ChatMessageImpl[]) {
        this.id = uuidv4();
        this.projectId = projectId;
        this.messages = messages;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
        makeAutoObservable(this);
    }

    getMessageById(id: string) {
        return this.messages.find((m) => m.id === id);
    }

    static fromJSON(data: ChatConversation) {
        const messages = data.messages
            .map((m) => {
                if (m.role === ChatMessageRole.USER) {
                    return UserChatMessageImpl.fromJSON(m as UserChatMessage);
                } else if (m.role === ChatMessageRole.ASSISTANT) {
                    return AssistantChatMessageImpl.fromJSON(m as AssistantChatMessage);
                } else {
                    console.error('Invalid message role', m.role);
                    return null;
                }
            })
            .filter((m) => m !== null) as ChatMessageImpl[];

        const conversation = new ChatConversationImpl(data.projectId, messages);
        conversation.id = data.id;
        conversation.displayName = data.displayName;
        conversation.createdAt = data.createdAt;
        conversation.updatedAt = data.updatedAt;
        return conversation;
    }

    updateTokenUsage(usage: TokenUsage) {
        this.tokenUsage = usage;
    }

    getMessagesForStream(): Message[] {
        return this.messages.map((m) => m.toStreamMessage());
    }

    async addOrUpdateMessage(message: ChatMessageImpl) {
        const index = this.messages.findIndex((m) => m.id === message.id);
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

    async saveMessageToStorage(message: ChatMessageImpl) {
        const success = await api.chat.saveMessage.mutate({
            message: fromMessage(this.id, message),
        });
        if (!success) {
            console.error('Failed to save message to storage', message);
        }
    }

    async removeMessagesFromStorage(messages: ChatMessageImpl[]) {
        const success = await api.chat.deleteMessages.mutate({
            messageIds: messages.map((m) => m.id),
        });
        if (!success) {
            console.error('Failed to delete messages from storage', messages);
        }
    }
}
