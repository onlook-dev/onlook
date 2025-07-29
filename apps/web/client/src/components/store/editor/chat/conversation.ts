
import { api } from '@/trpc/client';
import type { GitCommit } from '@onlook/git';
import { ChatMessageRole, MessageSnapshotType, type ChatConversation, type ChatMessage, type ChatMessageContext, type UserChatMessage } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { toast } from 'sonner';
import type { EditorEngine } from '../engine';
import { getUserChatMessageFromString } from './message';

interface CurrentConversation {
    conversation: ChatConversation;
    messages: ChatMessage[];
}

export class ConversationManager {
    current: CurrentConversation | null = null;
    conversations: ChatConversation[] = [];
    creatingConversation = false;

    constructor(
        private editorEngine: EditorEngine,
    ) {
        makeAutoObservable(this);
    }

    async applyConversations(conversations: ChatConversation[]) {
        this.conversations = conversations;
        if (conversations.length > 0 && conversations[0]) {
            const conversation = conversations[0];
            const messages = await this.getMessagesFromStorage(conversation.id);
            this.current = {
                conversation,
                messages
            };
        } else {
            this.startNewConversation();
        }
    }

    async updateCurrentConversation(conversation: Partial<ChatConversation>) {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        this.current.conversation = {
            ...this.current.conversation,
            ...conversation,
        };
        await this.updateConversationInStorage(this.current.conversation);
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
            if (this.current?.messages.length === 0 && !this.current?.conversation.title) {
                throw new Error('Current conversation is already empty.');
            }
            const newConversation = await api.chat.conversation.create.mutate({ projectId: this.editorEngine.projectId });
            this.current = {
                conversation: newConversation,
                messages: [],
            };
            this.conversations.push(newConversation);
        } catch (error) {
            console.error('Error starting new conversation', error);
            toast.error('Error starting new conversation.', {
                description: error instanceof Error ? error.message : 'Unknown error',
            });
        } finally {
            this.creatingConversation = false;
        }
    }

    async selectConversation(id: string) {
        const match = this.conversations.find((c) => c.id === id);
        if (!match) {
            console.error('No conversation found with id', id);
            return;
        }

        const messages = await this.getMessagesFromStorage(id);
        this.current = {
            conversation: match,
            messages: messages,
        };
    }

    async getMessagesFromStorage(id: string): Promise<ChatMessage[]> {
        return api.chat.message.get.query({ conversationId: id });
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
        if (this.current?.conversation.id === id) {
            if (this.conversations.length > 0 && !!this.conversations[0]) {
                this.selectConversation(this.conversations[0].id);
            } else {
                this.startNewConversation();
            }
        }
    }

    async addUserMessage(
        content: string,
        context: ChatMessageContext[],
    ): Promise<UserChatMessage> {
        if (!this.current) {
            console.error('No conversation found');
            throw new Error('No conversation found');
        }
        const message = getUserChatMessageFromString(content, context);
        await this.addOrReplaceMessage(message);
        return message;
    }

    attachCommitToUserMessage(id: string, commit: GitCommit) {
        const message = this.current?.messages.find((m) => m.id === id && m.role === ChatMessageRole.USER);
        if (!message) {
            console.error('No message found with id', id);
            return;
        }
        (message as UserChatMessage).snapshots.push({
            type: MessageSnapshotType.GIT,
            oid: commit.oid,
            createdAt: new Date(),
        });
    }

    async addOrReplaceMessage(message: ChatMessage) {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        this.current.conversation.updatedAt = new Date();

        // Add or replace the message
        const index = this.current.messages.findIndex((m) => m.id === message.id || (m.vercelId && m.vercelId === message.vercelId));
        if (index === -1) {
            console.log('adding message', message);
            this.current.messages.push(message);
        } else {
            console.log('replacing message', message);
            this.current.messages[index] = message;
        }
    }

    async getConversationsFromStorage(id: string): Promise<ChatConversation[] | null> {
        return api.chat.conversation.getAll.query({ projectId: id });
    }

    async updateConversationInStorage(conversation: ChatConversation) {
        await api.chat.conversation.update.mutate({ conversationId: conversation.id, title: conversation.title ?? '', metadata: conversation.metadata ?? {} });
    }

    async deleteConversationInStorage(id: string) {
        await api.chat.conversation.delete.mutate({ conversationId: id });
    }

    clear() {
        this.current = null;
        this.conversations = [];
    }
}
