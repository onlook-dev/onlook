import { ChatMessageType, type ChatConversation } from '@onlook/models/chat';
import type { CoreMessage } from 'ai';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import { AssistantChatMessageImpl } from './message/assistant';
import { UserChatMessageImpl } from './message/user';

export class ChatConversationImpl implements ChatConversation {
    id: string;
    projectId: string;
    displayName: string | undefined;
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

    updateCodeApplied(id: string) {
        for (const message of this.messages) {
            if (message.type !== 'assistant') {
                continue;
            }
            for (const block of message.content) {
                if (block.type !== 'code') {
                    continue;
                }
                // Revert all others
                block.applied = block.id === id;
            }
        }
        this.messages = [...this.messages];
    }

    updateCodeReverted(id: string) {
        for (const message of this.messages) {
            if (message.type !== 'assistant') {
                continue;
            }
            for (const block of message.content) {
                if (block.type !== 'code') {
                    continue;
                }
                // Revert only the block
                if (block.id === id) {
                    block.applied = false;
                    this.messages = [...this.messages];
                    return;
                }
            }
        }
        this.messages = [...this.messages];
    }
}
