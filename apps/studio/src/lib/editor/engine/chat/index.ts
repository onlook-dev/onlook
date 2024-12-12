import type { ProjectsManager } from '@/lib/projects';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import {
    MessageContextType,
    type ChatConversation,
    type FileMessageContext,
    type HighlightedMessageContext,
    type StreamResponse,
} from '@onlook/models/chat';
import type { CodeDiff } from '@onlook/models/code';
import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import type { CoreMessage } from 'ai';
import { makeAutoObservable, reaction } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import type { EditorEngine } from '..';
import { ChatContext } from './context';
import { ChatConversationImpl } from './conversation';
import { AssistantChatMessageImpl } from './message/assistant';
import { UserChatMessageImpl } from './message/user';
import { MOCK_CHAT_MESSAGES, MOCK_STREAMING_ASSISTANT_MSG } from './mockData';
import { StreamResolver } from './stream';

const USE_MOCK = false;

export class ChatManager {
    projectId: string | null = null;
    isWaiting = false;
    stream = new StreamResolver();
    context: ChatContext;
    streamingMessage: AssistantChatMessageImpl | null = USE_MOCK
        ? MOCK_STREAMING_ASSISTANT_MSG
        : null;
    conversation: ChatConversationImpl | null = null;
    conversations: ChatConversationImpl[] = [];

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
        this.context = new ChatContext(this.editorEngine);
        reaction(
            () => this.projectsManager.project,
            (current) => this.getCurrentProjectConversations(current),
        );
        reaction(
            () => this.stream.content,
            (content) => this.resolveStreamObject(content),
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
                USE_MOCK ? MOCK_CHAT_MESSAGES : [],
            );
        } else {
            this.conversation = this.conversations[0];
        }
    }

    resolveStreamObject(content: string | null) {
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }
        if (!this.projectId) {
            console.error('No project id found');
            return;
        }

        if (!content) {
            this.streamingMessage = null;
            return;
        }
        this.streamingMessage = new AssistantChatMessageImpl(content);
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
        await this.sendConversation();
    }

    async sendConversation(): Promise<void> {
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }

        this.stream.errorMessage = null;
        this.isWaiting = true;
        const messages = this.conversation.getMessagesForStream();
        const res: StreamResponse | null = await this.sendStreamRequest(messages);

        this.stream.clear();
        this.isWaiting = false;
        this.handleChatResponse(res);
        sendAnalytics('receive chat response');
    }

    sendStreamRequest(messages: CoreMessage[]): Promise<StreamResponse | null> {
        const requestId = nanoid();
        return invokeMainChannel(MainChannels.SEND_CHAT_MESSAGES_STREAM, {
            messages,
            requestId,
        });
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

        message.content = content;
        this.conversation.removeAllMessagesAfter(message);
        this.sendConversation();
        sendAnalytics('resubmit chat message');
    }

    async handleChatResponse(res: StreamResponse | null, applyCode: boolean = false) {
        if (!res) {
            console.error('No response found');
            return;
        }
        const assistantMessage = this.addAssistantMessage(res);
        if (!assistantMessage) {
            console.error('Failed to add assistant message');
            return;
        }

        if (applyCode) {
            this.applyGeneratedCode(assistantMessage.content);
        }
    }

    async addUserMessage(content: string): Promise<UserChatMessageImpl | undefined> {
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }

        const context = await this.getMessageContext();
        const newMessage = new UserChatMessageImpl(content, context);
        this.conversation.appendMessage(newMessage);
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

    // TODO: Add a type for the code change
    async applyGeneratedCode(change: any): Promise<void> {
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

    // TODO: Add a type for the code change
    async revertGeneratedCode(change: any): Promise<void> {
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

    addAssistantMessage(res: StreamResponse): AssistantChatMessageImpl | undefined {
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }
        const newMessage = new AssistantChatMessageImpl(res.content);
        this.conversation.appendMessage(newMessage);
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
                type: MessageContextType.HIGHLIGHT,
                displayName: node.tagName.toLowerCase(),
                path: templateNode.path,
                content: codeBlock,
                start: templateNode.startTag.start.line,
                end: templateNode.endTag?.end.line || templateNode.startTag.start.line,
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
                type: MessageContextType.FILE,
                displayName: fileName,
                path: fileName,
                content: fileContent,
            });
        }
        return [...fileContext, ...highlightedContext];
    }
}
