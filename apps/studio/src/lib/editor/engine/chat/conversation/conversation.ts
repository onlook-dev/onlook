import { ChatMessageRole, type ChatConversation, type TokenUsage } from '@onlook/models/chat';
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

    // Summary
    private readonly TOKEN_LIMIT = 200000;
    private readonly SUMMARY_THRESHOLD = this.TOKEN_LIMIT * 0.75; // Trigger at 75% of token limit
    private readonly RETAINED_MESSAGES = 10;
    summaryMessage: AssistantChatMessageImpl | null = null;

    public tokenUsage: TokenUsage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
    };

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
        conversation.messages = data.messages
            .map((m) => {
                if (m.role === ChatMessageRole.USER) {
                    return UserChatMessageImpl.fromJSON(m);
                } else if (m.role === ChatMessageRole.ASSISTANT) {
                    return AssistantChatMessageImpl.fromJSON(m);
                } else {
                    console.error('Invalid message role', m.role);
                    return null;
                }
            })
            .filter((m) => m !== null) as (UserChatMessageImpl | AssistantChatMessageImpl)[];
        conversation.createdAt = data.createdAt;
        conversation.updatedAt = data.updatedAt;

        if (data.tokenUsage) {
            conversation.tokenUsage = data.tokenUsage;
        }
        if (data.summaryMessage) {
            conversation.summaryMessage = AssistantChatMessageImpl.fromJSON(data.summaryMessage);
        }

        return conversation;
    }

    needsSummary(): boolean {
        return this.tokenUsage.totalTokens > this.SUMMARY_THRESHOLD;
    }

    updateTokenUsage(usage: TokenUsage) {
        this.tokenUsage = usage;
    }

    getMessagesForStream(): CoreMessage[] {
        const messages: CoreMessage[] = [];

        if (this.summaryMessage) {
            messages.push(this.summaryMessage.toCoreMessage());
            const retainedMessages = this.messages.slice(-this.RETAINED_MESSAGES);
            messages.push(...retainedMessages.map((m) => m.toCoreMessage()));
        } else {
            messages.push(...this.messages.map((m) => m.toCoreMessage()));
        }

        return messages;
    }

    setSummaryMessage(content: string) {
        this.summaryMessage = new AssistantChatMessageImpl(
            `Technical Summary of Previous Conversations:\n${content}`,
        );
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
        return this.messages.findLast((message) => message.role === ChatMessageRole.USER);
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
