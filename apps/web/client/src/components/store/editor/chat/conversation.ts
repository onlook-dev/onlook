import { api } from '@/trpc/client';
import { fromMessage } from '@onlook/db';
import type { GitCommit } from '@onlook/git';
import { ChatMessageRole, MessageCheckpointType, type ChatConversation, type ChatMessage, type MessageContext, type UserChatMessage } from '@onlook/models';
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
            if (this.current?.messages.length === 0 && !this.current?.conversation.title) {
                throw new Error('Current conversation is already empty.');
            }
            const newConversation = await api.chat.conversation.upsert.mutate({
                projectId: this.editorEngine.projectId,
            });
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
        return api.chat.message.getAll.query({ conversationId: id });
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
        context: MessageContext[],
    ): Promise<UserChatMessage> {
        if (!this.current) {
            console.error('No conversation found');
            throw new Error('No conversation found');
        }
        const message = getUserChatMessageFromString(content, context, this.current.conversation.id);
        await this.addOrReplaceMessage(message);
        if (!this.current.conversation.title) {
            this.addConversationTitle(this.current.conversation.id, content);
        }
        return message;
    }

    async addConversationTitle(conversationId: string, content: string) {
        const title = await api.chat.conversation.generateTitle.mutate({
            conversationId,
            content,
        });
        if (!title) {
            console.error('Error generating conversation title');
            return;
        }
        // Update conversation in list
        const listConversation = this.conversations.find((c) => c.id === conversationId);
        if (!listConversation) {
            console.error('No conversation found');
            return;
        }
        listConversation.title = title;
    }

    async attachCommitToUserMessage(id: string, commit: GitCommit): Promise<void> {
        const message = this.current?.messages.find((m) => m.id === id && m.role === ChatMessageRole.USER);
        if (!message) {
            console.error('No message found with id', id);
            return;
        }
        const userMessage = message as UserChatMessage;
        const newCheckpoints = [
            ...userMessage.content.metadata.checkpoints,
            {
                type: MessageCheckpointType.GIT,
                oid: commit.oid,
                createdAt: new Date(),
            },
        ];
        userMessage.content.metadata.checkpoints = newCheckpoints;
        await api.chat.message.updateCheckpoints.mutate({
            messageId: message.id,
            checkpoints: newCheckpoints,
        });
        await this.addOrReplaceMessage(userMessage);
    }

    async addOrReplaceMessage(message: ChatMessage) {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        const index = this.current.messages.findIndex((m) => m.id === message.id || (m.content.metadata.vercelId && m.content.metadata.vercelId === message.content.metadata.vercelId));
        if (index === -1) {
            this.current.messages.push(message);
        } else {
            this.current.messages[index] = message;
        }
        await this.upsertMessageInStorage(message);
    }

    async removeMessages(messages: ChatMessage[]) {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        this.current.messages = this.current.messages.filter((m) => !messages.includes(m));
        await this.deleteMessagesInStorage(messages.map((m) => m.id));
    }

    async getConversationsFromStorage(id: string): Promise<ChatConversation[] | null> {
        return api.chat.conversation.getAll.query({ projectId: id });
    }

    async updateConversationInStorage(conversation: Partial<ChatConversation> & { id: string }) {
        await api.chat.conversation.update.mutate({
            conversationId: conversation.id,
            conversation,
        });
    }

    async deleteConversationInStorage(id: string) {
        await api.chat.conversation.delete.mutate({ conversationId: id });
    }

    async deleteMessagesInStorage(messageIds: string[]) {
        await api.chat.message.delete.mutate({ messageIds });
    }

    async upsertMessageInStorage(message: ChatMessage) {
        await api.chat.message.upsert.mutate({ message: fromMessage(message) });
    }

    clear() {
        this.current = null;
        this.conversations = [];
    }
}
