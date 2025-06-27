import { type ProjectManager } from '@/components/store/project/manager';
import { api } from '@/trpc/client';
import type { GitCommit } from '@onlook/git';
import { ChatMessageRole, type ChatConversation, type ChatMessageContext } from '@onlook/models';
import type { Message } from 'ai';
import { makeAutoObservable } from 'mobx';
import type { ChatManager } from '..';
import { AssistantChatMessageImpl } from '../message/assistant';
import { UserChatMessageImpl } from '../message/user';
import { ChatConversationImpl, type ChatMessageImpl } from './conversation';

export class ConversationManager {
    private _current: ChatConversationImpl | null = null;
    private _conversations: ChatConversation[] = [];

    constructor(
        private chatManager: ChatManager,
        private projectManager: ProjectManager,
    ) {
        makeAutoObservable(this);
    }

    get current() {
        return this._current;
    }

    get conversations() {
        return this._conversations;
    }

    async fetchOrCreateConversation(projectId: string) {
        this._conversations = await this.getConversations(projectId);

        if (this.conversations.length > 0 && !!this.conversations[0]) {
            this._current = ChatConversationImpl.fromJSON(this.conversations[0]);
        } else {
            console.error('No conversations found, creating new conversation');
            this.startNewConversation();
        }
    }

    setCurrentConversation(conversation: ChatConversation) {
        this._current = ChatConversationImpl.fromJSON(conversation);
        this._conversations.push(this._current);
    }

    async getConversations(projectId: string): Promise<ChatConversationImpl[]> {
        const res: ChatConversation[] | null = await this.getConversationsFromStorage(projectId);
        if (!res) {
            console.error('No conversations found');
            return [];
        }
        const conversations = res?.map((c) => ChatConversationImpl.fromJSON(c));

        const sorted = conversations.sort((a, b) => {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        return sorted || [];
    }

    startNewConversation() {
        if (!this.projectManager.project?.id) {
            console.error('No project id found');
            return;
        }
        if (this.current && this.current.messages.length === 0 && !this.current.displayName) {
            console.error(
                'Error starting new conversation. Current conversation is already empty.',
            );
            return;
        }
        console.log('Starting new conversation');
        this._current = ChatConversationImpl.create(this.projectManager.project.id);
        this._conversations.push(this._current);
        this._current.saveConversationToStorage();
    }

    selectConversation(id: string) {
        if (!this.projectManager.project?.id) {
            console.error('No project id found');
            return;
        }
        const match = this.conversations.find((c) => c.id === id);
        if (!match) {
            console.error('No conversation found with id', id);
            return;
        }
        this._current = ChatConversationImpl.fromJSON(match);
    }

    deleteConversation(id: string) {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        if (!this.projectManager.project?.id) {
            console.error('No project id found');
            return;
        }

        const index = this.conversations.findIndex((c) => c.id === id);
        if (index === -1) {
            console.error('No conversation found with id', id);
            return;
        }
        this.conversations.splice(index, 1);
        this.deleteConversationInStorage(id);
        if (this.current.id === id) {
            if (this.conversations.length > 0 && !!this.conversations[0]) {
                this._current = ChatConversationImpl.fromJSON(this.conversations[0]);
            } else {
                this.startNewConversation();
            }
        }
    }

    async addUserMessage(
        content: string,
        context: ChatMessageContext[],
    ): Promise<UserChatMessageImpl | undefined> {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        const newMessage = UserChatMessageImpl.fromStringContent(content, context);
        await this.addMessage(newMessage);
        return newMessage;
    }

    attachCommitToUserMessage(id: string, commit: GitCommit) {
        const message = this.current?.messages.find((m) => m.id === id && m.role === ChatMessageRole.USER);
        if (!message) {
            console.error('No message found with id', id);
            return;
        }
        (message as UserChatMessageImpl).commitOid = commit.oid;
        this.current?.updateMessage(message);
    }

    async addAssistantMessage(message: Message): Promise<AssistantChatMessageImpl | undefined> {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        const newMessage = AssistantChatMessageImpl.fromMessage(message);
        await this.addMessage(newMessage);
        return newMessage;
    }

    private async addMessage(message: ChatMessageImpl) {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        await this.current.addOrUpdateMessage(message);
        await this.current.saveConversationToStorage();
    }

    async getConversationsFromStorage(id: string): Promise<ChatConversation[] | null> {
        return api.chat.conversation.get.query({ projectId: id });
    }

    async deleteConversationInStorage(id: string) {
        const success = await api.chat.conversation.delete.mutate({ conversationId: id });
        if (!success) {
            console.error('Failed to delete conversation in storage', id);
        }
        return success;
    }

    clear() {
        this._current = null;
        this._conversations = [];
    }
}
