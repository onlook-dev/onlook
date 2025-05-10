import { MAX_NAME_LENGTH } from '@onlook/constants';
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

type ChatMessageImpl = UserChatMessageImpl | AssistantChatMessageImpl;

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
        makeAutoObservable(this);
        this.id = uuidv4();
        this.projectId = projectId;
        this.messages = messages;
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
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

    appendMessage(message: ChatMessageImpl) {
        this.messages = [...this.messages, message];
        this.updatedAt = new Date().toISOString();
    }

    removeAllMessagesAfter(message: ChatMessageImpl) {
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
        return this.messages.findLast((message) => message.role === ChatMessageRole.USER);
    }

    updateMessage(message: ChatMessageImpl) {
        const index = this.messages.findIndex((m) => m.id === message.id);
        this.messages[index] = message;
        this.updatedAt = new Date().toISOString();
        this.messages = [...this.messages];
    }

    updateCodeReverted(id: string) {
        this.messages = [...this.messages];
    }
}
