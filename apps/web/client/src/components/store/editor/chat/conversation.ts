import { api } from '@/trpc/client';
import { toDbMessage } from '@onlook/db';
import type { GitCommit } from '@onlook/git';
import { MessageCheckpointType, type ChatConversation, type ChatMessage } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { toast } from 'sonner';
import type { EditorEngine } from '../engine';

interface CurrentConversation extends ChatConversation {
    messageCount: number;
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
            await this.selectConversation(conversation.id);
        } else {
            await this.startNewConversation();
        }
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
            const newConversation = await api.chat.conversation.upsert.mutate({
                projectId: this.editorEngine.projectId,
            });
            this.current = {
                ...newConversation,
                messageCount: 0,
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

        this.current = {
            ...match,
            messageCount: 0,
        };
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
        void this.deleteConversationInStorage(id);
        if (this.current?.id === id) {
            if (this.conversations.length > 0 && !!this.conversations[0]) {
                void this.selectConversation(this.conversations[0].id);
            } else {
                void this.startNewConversation();
            }
        }
    }

    async attachCommitToUserMessage(message: ChatMessage, commit: GitCommit): Promise<void> {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        const newCheckpoints = [
            ...(message.metadata?.checkpoints ?? []),
            {
                type: MessageCheckpointType.GIT,
                oid: commit.oid,
                createdAt: new Date(),
            },
        ];
        message.metadata = {
            ...message.metadata,
            createdAt: message.metadata?.createdAt ?? new Date(),
            conversationId: message.metadata?.conversationId ?? this.current.id,
            checkpoints: newCheckpoints,
            context: message.metadata?.context ?? [],
        };
        await api.chat.message.updateCheckpoints.mutate({
            messageId: message.id,
            checkpoints: newCheckpoints,
        });
        await this.upsertMessageInStorage(message);
    }

    async getConversationsFromStorage(id: string): Promise<ChatConversation[] | null> {
        return api.chat.conversation.getAll.query({ projectId: id });
    }

    async updateConversationInStorage(conversation: Partial<ChatConversation> & { id: string }) {
        await api.chat.conversation.update.mutate(conversation);
    }

    async deleteConversationInStorage(id: string) {
        await api.chat.conversation.delete.mutate({ conversationId: id });
    }

    async deleteMessagesInStorage(messageIds: string[]) {
        await api.chat.message.delete.mutate({ messageIds });
    }

    async upsertMessageInStorage(message: ChatMessage) {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        await api.chat.message.upsert.mutate({ message: toDbMessage(message, this.current.id) });
    }

    clear() {
        this.current = null;
        this.conversations = [];
    }
}
