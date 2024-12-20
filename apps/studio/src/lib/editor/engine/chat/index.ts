import type { ProjectsManager } from '@/lib/projects';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import { type StreamResponse } from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { CoreMessage } from 'ai';
import { makeAutoObservable, reaction } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import type { EditorEngine } from '..';
import { ChatCodeManager } from './code';
import { ChatContext } from './context';
import { ConversationManager } from './conversation';
import { AssistantChatMessageImpl } from './message/assistant';
import { MOCK_STREAMING_ASSISTANT_MSG } from './mockData';
import { StreamResolver } from './stream';
const USE_MOCK = false;

export class ChatManager {
    isWaiting = false;
    conversation: ConversationManager;
    code: ChatCodeManager;
    context: ChatContext;
    stream: StreamResolver;
    streamingMessage: AssistantChatMessageImpl | null = USE_MOCK
        ? MOCK_STREAMING_ASSISTANT_MSG
        : null;
    shouldAutoScroll = true;

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
        this.context = new ChatContext(this.editorEngine);
        this.conversation = new ConversationManager(this.projectsManager);
        this.stream = new StreamResolver();
        this.code = new ChatCodeManager(this);
        this.listen();
    }

    listen() {
        reaction(
            () => this.stream.content,
            (content) => this.resolveStreamObject(content),
        );
    }

    resolveStreamObject(content: string | null) {
        if (!this.conversation) {
            console.error('No conversation found');
            return;
        }
        if (!this.conversation.projectId) {
            console.error('No project id found');
            return;
        }

        if (!content) {
            this.streamingMessage = null;
            return;
        }
        this.streamingMessage = new AssistantChatMessageImpl(content);
    }

    async sendNewMessage(content: string): Promise<void> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return;
        }

        const context = await this.context.getChatContext();
        const userMessage = this.conversation.addUserMessage(content, context);
        this.conversation.current.updateName(content);
        if (!userMessage) {
            console.error('Failed to add user message');
            return;
        }
        sendAnalytics('send chat message');
        await this.sendChatToAi();
    }

    async sendChatToAi(): Promise<void> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return;
        }
        this.shouldAutoScroll = true;
        this.stream.errorMessage = null;
        this.isWaiting = true;
        const messages = this.conversation.current.getMessagesForStream();
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
        if (!this.conversation.current) {
            console.error('No conversation found');
            return;
        }
        const message = this.conversation.current.messages.find((m) => m.id === id);
        if (!message) {
            console.error('No message found with id', id);
            return;
        }
        if (message.type !== 'user') {
            console.error('Can only edit user messages');
            return;
        }

        message.content = content;
        this.conversation.current.removeAllMessagesAfter(message);
        this.sendChatToAi();
        sendAnalytics('resubmit chat message');
    }

    async handleChatResponse(res: StreamResponse | null, applyCode: boolean = false) {
        if (!res) {
            console.error('No response found');
            return;
        }
        if (res.status === 'error') {
            console.error('Error found in chat response', res.content);
            this.stream.errorMessage = res.content;
            return;
        }
        const assistantMessage = this.conversation.addAssistantMessage(res);
        if (!assistantMessage) {
            console.error('Failed to add assistant message');
            return;
        }

        if (applyCode) {
            this.code.applyCode(assistantMessage.id);
        }
    }
}
