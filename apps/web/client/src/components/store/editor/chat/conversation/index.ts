import { type ProjectManager } from '@/components/store/project/manager';
import { api } from '@/trpc/client';
import { fromConversation } from '@onlook/db';
import { type ChatConversation, type ChatMessageContext } from '@onlook/models';
import type { Project } from '@onlook/models/project';
import type { Message } from 'ai';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../../engine';
import { AssistantChatMessageImpl } from '../message/assistant';
import { UserChatMessageImpl } from '../message/user';
import { ChatConversationImpl, type ChatMessageImpl } from './conversation';

export class ConversationManager {
    projectId: string | null = null;
    current: ChatConversationImpl | null = null;
    conversations: ChatConversationImpl[] = [];

    constructor(
        private editorEngine: EditorEngine,
        private projectManager: ProjectManager,
    ) {
        makeAutoObservable(this);
        reaction(
            () => this.projectManager.project,
            (current) => this.getCurrentProjectConversations(current),
        );
    }

    async getCurrentProjectConversations(project: Project | null) {
        if (!project) {
            return;
        }
        if (this.projectId === project.id) {
            return;
        }
        this.projectId = project.id;

        this.conversations = await this.getConversations(project.id);
        if (this.conversations.length === 0 && !this.conversations[0]) {
            this.current = new ChatConversationImpl(project.id, []);
        } else {
            this.current = this.conversations[0] ?? null;
        }
    }

    async getConversations(projectId: string): Promise<ChatConversationImpl[]> {
        const res: ChatConversation[] | null = await this.getConversationFromStorage(projectId);
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
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        if (!this.projectId) {
            console.error('No project id found');
            return;
        }
        if (this.current.messages.length === 0 && !this.current.displayName) {
            console.error(
                'Error starting new conversation. Current conversation is already empty.',
            );
            return;
        }
        this.current = new ChatConversationImpl(this.projectId, []);
        this.conversations.push(this.current);
        this.saveConversationToStorage();
    }

    selectConversation(id: string) {
        const match = this.conversations.find((c) => c.id === id);
        if (!match) {
            console.error('No conversation found with id', id);
            return;
        }
        this.current = match;
    }

    deleteConversation(id: string) {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        if (!this.projectId) {
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
            if (this.conversations.length > 0) {
                this.current = this.conversations[0] ?? null;
            } else {
                this.current = new ChatConversationImpl(this.projectId, []);
                this.conversations.push(this.current);
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
    }

    async getConversationFromStorage(id: string): Promise<ChatConversation[] | null> {
        const res = await api.chat.getConversation.query({ projectId: id });
        return res;
    }

    async deleteConversationInStorage(id: string) {
        const success = await api.chat.deleteConversation.mutate({ conversationId: id });
        if (!success) {
            console.error('Failed to delete conversation in storage', id);
        }
    }

    async saveConversationToStorage() {
        if (!this.current) {
            console.error('No conversation found');
            return Promise.resolve();
        }
        const res = await api.chat.saveConversation.mutate({
            conversation: fromConversation(this.current),
        });
        if (!res) {
            console.error('Failed to save conversation to storage', this.current);
        }
    }
}
