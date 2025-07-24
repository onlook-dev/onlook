
import { api } from '@/trpc/client';
import type { GitCommit } from '@onlook/git';
import { ChatMessageRole, type ChatConversation, type ChatMessage, type ChatMessageContext, type UserChatMessage } from '@onlook/models';
import type { Message } from 'ai';
import { makeAutoObservable } from 'mobx';
import { toast } from 'sonner';
import type { EditorEngine } from '../engine';
import { AssistantChatMessageImpl } from './message/assistant';
import { UserChatMessageImpl } from './message/user';

export class ConversationManager {
    private _current: ChatConversation | null = null;
    private _currentMessages: ChatMessage[] = [];
    private _conversations: ChatConversation[] = [];
    creatingConversation = false;

    constructor(
        private editorEngine: EditorEngine,
    ) {
        makeAutoObservable(this);
    }

    get current() {
        return this._current;
    }

    get conversations() {
        return this._conversations;
    }

    async getConversations(projectId: string): Promise<ChatConversation[]> {
        const res: ChatConversation[] | null = await this.getConversationsFromStorage(projectId);
        if (!res) {
            console.error('No conversations found');
            return [];
        }
        const conversations = res;

        const sorted = conversations.sort((a, b) => {
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        });
        return sorted || [];
    }

    async startNewConversation() {
        try {
            this.creatingConversation = true;
            if (this._currentMessages.length === 0 && !this.current?.title) {
                throw new Error('Current conversation is already empty.');
            }
            const newConversation = await api.chat.conversation.create.mutate({ projectId: this.editorEngine.projectId });
            this._current = newConversation;
            this._conversations.push(this._current);
        } catch (error) {
            console.error('Error starting new conversation', error);
            toast.error('Error starting new conversation.', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            this.creatingConversation = false;
        }
    }

    selectConversation(id: string) {
        const match = this.conversations.find((c) => c.id === id);
        if (!match) {
            console.error('No conversation found with id', id);
            return;
        }
        this._current = match;
    }

    deleteConversation(id: string) {
        if (!this.current) {
            console.error('No conversation found');
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
                this._current = this.conversations[0];
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
        const message = this._currentMessages.find((m) => m.id === id && m.role === ChatMessageRole.USER);
        if (!message) {
            console.error('No message found with id', id);
            return;
        }
        (message as UserChatMessage).commitOid = commit.oid;
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

    private async addMessage(message: ChatMessage) {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        await this.current.addOrUpdateMessage(message);
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
