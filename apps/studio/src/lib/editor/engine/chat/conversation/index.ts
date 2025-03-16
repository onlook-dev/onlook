import type { ProjectsManager } from '@/lib/projects';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import { type ChatConversation, type ChatMessageContext } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import type { CoreAssistantMessage, CoreUserMessage } from 'ai';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../..';
import { AssistantChatMessageImpl } from '../message/assistant';
import { UserChatMessageImpl } from '../message/user';
import { MOCK_CHAT_MESSAGES } from '../mockData';
import { ChatConversationImpl } from './conversation';
const USE_MOCK = false;

export class ConversationManager {
    projectId: string | null = null;
    current: ChatConversationImpl | null = null;
    conversations: ChatConversationImpl[] = [];

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
        reaction(
            () => this.projectsManager.project,
            (current) => this.getCurrentProjectConversations(current),
        );
    }

    async getCurrentProjectConversations(project: Project | null) {
        this.editorEngine.chat.stream.clear();
        if (!project) {
            return;
        }
        if (this.projectId === project.id) {
            return;
        }
        this.projectId = project.id;

        this.conversations = await this.getConversations(project.id);
        if (this.conversations.length === 0) {
            this.current = new ChatConversationImpl(project.id, []);
        } else {
            this.current = this.conversations[0];
        }

        if (USE_MOCK) {
            this.current = new ChatConversationImpl(project.id, MOCK_CHAT_MESSAGES);
        }
    }

    async getConversations(projectId: string): Promise<ChatConversationImpl[]> {
        const res: ChatConversation[] | null = await invokeMainChannel(
            MainChannels.GET_CONVERSATIONS_BY_PROJECT,
            { projectId },
        );
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
        this.editorEngine.chat.stream.clear();
        sendAnalytics('start new conversation');
    }

    selectConversation(id: string) {
        const match = this.conversations.find((c) => c.id === id);
        if (!match) {
            console.error('No conversation found with id', id);
            return;
        }
        this.current = match;
        this.editorEngine.chat.stream.clear();
        sendAnalytics('select conversation');
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
                this.current = this.conversations[0];
            } else {
                this.current = new ChatConversationImpl(this.projectId, []);
                this.conversations.push(this.current);
            }
        }
        this.editorEngine.chat.stream.clear();
        sendAnalytics('delete conversation');
    }

    deleteConversationInStorage(id: string) {
        invokeMainChannel(MainChannels.DELETE_CONVERSATION, { id });
    }

    saveConversationToStorage() {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        invokeMainChannel(MainChannels.SAVE_CONVERSATION, {
            conversation: this.current,
        });
    }

    async generateConversationSummary(): Promise<void> {
        if (!this.current || !this.current.needsSummary()) {
            return;
        }

        const res: string | null = await invokeMainChannel(MainChannels.GENERATE_CHAT_SUMMARY, {
            messages: this.current.getMessagesForStream(),
        });

        if (!res) {
            console.log(`Failed to generate summary for conversation`);
            return;
        }
        this.current.setSummaryMessage(res);
        this.saveConversationToStorage();
    }

    addUserMessage(
        stringContent: string,
        context: ChatMessageContext[],
    ): UserChatMessageImpl | undefined {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        const newMessage = UserChatMessageImpl.fromStringContent(stringContent, context);
        this.current.appendMessage(newMessage);
        this.saveConversationToStorage();
        return newMessage;
    }

    addCoreUserMessage(coreMessage: CoreUserMessage): UserChatMessageImpl | undefined {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        const newMessage = UserChatMessageImpl.fromCoreMessage(coreMessage);
        this.current.appendMessage(newMessage);
        this.saveConversationToStorage();
        return newMessage;
    }

    addCoreAssistantMessage(
        coreMessage: CoreAssistantMessage,
    ): AssistantChatMessageImpl | undefined {
        if (!this.current) {
            console.error('No conversation found');
            return;
        }
        const newMessage = AssistantChatMessageImpl.fromCoreMessage(coreMessage);
        this.current.appendMessage(newMessage);
        this.saveConversationToStorage();
        return newMessage;
    }
}
