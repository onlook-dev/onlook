import type { ProjectsManager } from '@/lib/projects';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import type {
    ChatConversation,
    CodeChangeBlock,
    FileMessageContext,
    HighlightedMessageContext,
    StreamResponse,
    StreamResult,
} from '@onlook/models/chat';
import type { CodeDiff } from '@onlook/models/code';
import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import type { DeepPartial } from 'ai';
import { makeAutoObservable, reaction } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import type { PartialDeep } from 'type-fest';
import type { EditorEngine } from '..';
import { ChatConversationImpl } from './conversation';
import { AssistantChatMessageImpl } from './message/assistant';
import { UserChatMessageImpl } from './message/user';
import { MOCK_CHAT_MESSAGES, MOCK_STREAMING_ASSISTANT_MSG } from './mockData';
import { StreamResolver } from './stream';

export class ChatManager {
    projectId: string | null = null;
    isWaiting = false;
    USE_MOCK = false;
    stream = new StreamResolver();
    streamingMessage: AssistantChatMessageImpl | null = this.USE_MOCK
        ? MOCK_STREAMING_ASSISTANT_MSG
        : null;
    conversation: ChatConversationImpl | null = null;
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
        reaction(
            () => this.stream.current,
            (current) => this.resolveStreamObject(current),
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
        if (this.conversations.length === 0) {
            this.conversation = new ChatConversationImpl(
                project.id,
                this.USE_MOCK ? MOCK_CHAT_MESSAGES : [],
            );
        } else {
            this.conversation = this.conversations[0];
        }
    }

    resolveStreamObject(res: DeepPartial<StreamResponse> | null) {
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }
        if (!this.projectId) {
            console.error('No project id found');
            return;
        }

        if (!res) {
            this.streamingMessage = null;
            return;
        }
        const lastUserMessage: UserChatMessageImpl | undefined =
            this.conversation.getLastUserMessage();
        if (!res.blocks) {
            return;
        }
        this.streamingMessage = new AssistantChatMessageImpl(
            res.blocks,
            lastUserMessage?.context || [],
        );
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
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }
        if (!this.projectId) {
            console.error('No project id found');
            return;
        }
        if (this.conversation.messages.length === 0 && !this.conversation.displayName) {
            console.error(
                'Error starting new conversation. Current conversation is already empty.',
            );
            return;
        }
        this.conversation = new ChatConversationImpl(this.projectId, []);
        this.conversations.push(this.conversation);
        sendAnalytics('start new conversation');
    }

    deleteConversation(id: string) {
        if (!this.conversation) {
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
        if (this.conversation.id === id) {
            if (this.conversations.length > 0) {
                this.conversation = this.conversations[0];
            } else {
                this.conversation = new ChatConversationImpl(this.projectId, []);
                this.conversations.push(this.conversation);
            }
        }
        sendAnalytics('delete conversation');
    }

    selectConversation(id: string) {
        const match = this.conversations.find((c) => c.id === id);
        if (!match) {
            console.error('No conversation found with id', id);
            return;
        }
        this.conversation = match;
        sendAnalytics('select conversation');
    }

    async sendNewMessage(content: string): Promise<void> {
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }

        const userMessage = await this.addUserMessage(content);
        this.conversation.updateName(content);
        if (!userMessage) {
            console.error('Failed to add user message');
            return;
        }
        sendAnalytics('send chat message');
        await this.sendMessage(userMessage);
    }

    async sendMessage(userMessage: UserChatMessageImpl): Promise<void> {
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }

        this.stream.errorMessage = null;
        this.isWaiting = true;
        const messageParams = this.conversation.getCoreMessages();
        const res: StreamResult = await invokeMainChannel(MainChannels.SEND_CHAT_MESSAGES_STREAM, {
            messages: messageParams,
            requestId: nanoid(),
        });

        this.stream.clear();
        this.isWaiting = false;
        this.handleChatResponse(res, userMessage);
        sendAnalytics('receive chat response');
    }

    stopStream() {
        const requestId = nanoid();
        invokeMainChannel(MainChannels.SEND_STOP_STREAM_REQUEST, {
            requestId,
        });
        sendAnalytics('stop chat stream');
    }

    resubmitMessage(id: string, content: string) {
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }
        const message = this.conversation.messages.find((m) => m.id === id);
        if (!message) {
            console.error('No message found with id', id);
            return;
        }
        if (message.type !== 'user') {
            console.error('Can only edit user messages');
            return;
        }

        message.editContent(content);
        this.conversation.trimToMessage(message);
        this.sendMessage(message);
        sendAnalytics('resubmit chat message');
    }

    async handleChatResponse(res: StreamResult, userMessage: UserChatMessageImpl) {
        if (!res.object) {
            console.error('No response object found');
            return;
        }

        if (!res.object.blocks || res.object.blocks.length === 0) {
            console.error('No blocks found in response');
            return;
        }

        const assistantMessage = this.addAssistantMessage(res.object, userMessage);
        if (!assistantMessage) {
            console.error('Failed to add assistant message');
            return;
        }

        for (const block of assistantMessage?.content || []) {
            if (block.type === 'text') {
                continue;
            }
            if (block.type === 'code') {
                if (res.success) {
                    await this.applyGeneratedCode(block);
                }
            }
        }
    }

    async addUserMessage(content: string): Promise<UserChatMessageImpl | undefined> {
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }

        const context = await this.getMessageContext();
        const newMessage = new UserChatMessageImpl(content, context);
        this.conversation.addMessage(newMessage);
        this.saveConversationToStorage();
        return newMessage;
    }

    saveConversationToStorage() {
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }
        invokeMainChannel(MainChannels.SAVE_CONVERSATION, {
            conversation: this.conversation,
        });
    }

    deleteConversationInStorage(id: string) {
        invokeMainChannel(MainChannels.DELETE_CONVERSATION, { id });
    }

    async applyGeneratedCode(change: CodeChangeBlock): Promise<void> {
        if (change.value === '') {
            console.error('No code found in response');
            return;
        }

        const codeDiff: CodeDiff[] = [
            {
                path: change.fileName,
                original: '',
                generated: change.value,
            },
        ];

        const res = await invokeMainChannel(MainChannels.WRITE_CODE_BLOCKS, codeDiff);
        if (!res) {
            console.error('Failed to apply code change');
            return;
        }

        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }

        this.conversation.updateCodeApplied(change.id);
        this.saveConversationToStorage();
        sendAnalytics('apply code change');
    }

    async revertGeneratedCode(change: CodeChangeBlock): Promise<void> {
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }

        const codeDiff: CodeDiff[] = [
            {
                path: change.fileName,
                original: change.value,
                generated: change.original,
            },
        ];

        const res = await invokeMainChannel(MainChannels.WRITE_CODE_BLOCKS, codeDiff);
        if (!res) {
            console.error('Failed to revert code change');
            return;
        }

        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }

        this.conversation.updateCodeReverted(change.id);
        this.saveConversationToStorage();
        sendAnalytics('revert code change');
    }

    addAssistantMessage(
        res: PartialDeep<StreamResponse>,
        userMessage: UserChatMessageImpl,
    ): AssistantChatMessageImpl | undefined {
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }
        const newMessage = new AssistantChatMessageImpl(res.blocks || [], userMessage.context);
        this.conversation.addMessage(newMessage);
        this.saveConversationToStorage();
        return newMessage;
    }

    async getMessageContext() {
        const selected = this.editorEngine.elements.selected;
        if (selected.length === 0) {
            return [];
        }

        const fileNames = new Set<string>();

        const highlightedContext: HighlightedMessageContext[] = [];
        for (const node of selected) {
            const oid = node.oid;
            if (!oid) {
                continue;
            }
            const codeBlock = await this.editorEngine.code.getCodeBlock(oid);
            if (!codeBlock) {
                continue;
            }

            const templateNode = await this.editorEngine.ast.getTemplateNodeById(oid);
            if (!templateNode) {
                continue;
            }
            highlightedContext.push({
                type: 'selected',
                name: node.tagName.toLowerCase(),
                value: codeBlock,
                templateNode: templateNode,
            });
            fileNames.add(templateNode.path);
        }

        const fileContext: FileMessageContext[] = [];
        for (const fileName of fileNames) {
            const fileContent = await this.editorEngine.code.getFileContent(fileName);
            if (!fileContent) {
                continue;
            }
            fileContext.push({
                type: 'file',
                name: fileName,
                value: fileContent,
            });
        }
        return [...fileContext, ...highlightedContext];
    }
}
