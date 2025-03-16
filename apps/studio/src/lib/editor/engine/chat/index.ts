import type { ProjectsManager } from '@/lib/projects';
import type { UserManager } from '@/lib/user';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import {
    ChatMessageRole,
    StreamRequestType,
    type ErrorStreamResponse,
    type FullStreamResponse,
    type RateLimitedStreamResponse,
} from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { ParsedError } from '@onlook/utility';
import type { CoreMessage, TextStreamPart, ToolSet } from 'ai';
import { makeAutoObservable, reaction } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import type { EditorEngine } from '..';
import { ChatCodeManager } from './code';
import { ChatContext } from './context';
import { ConversationManager } from './conversation';
import { isPromptTooLongError, PROMPT_TOO_LONG_ERROR } from './helpers';
import { AssistantChatMessageImpl } from './message/assistant';
import { MOCK_STREAMING_ASSISTANT_MSG } from './mockData';
import { StreamResolver } from './stream';
import { SuggestionManager } from './suggestions';

const USE_MOCK = false;
export const FOCUS_CHAT_INPUT_EVENT = 'focus-chat-input';

export class ChatManager {
    isWaiting = false;
    conversation: ConversationManager;
    code: ChatCodeManager;
    context: ChatContext;
    stream: StreamResolver;
    suggestions: SuggestionManager;
    streamingMessage: AssistantChatMessageImpl | null = USE_MOCK
        ? MOCK_STREAMING_ASSISTANT_MSG
        : null;
    shouldAutoScroll = true;
    private disposers: Array<() => void> = [];

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
        private userManager: UserManager,
    ) {
        makeAutoObservable(this);
        this.context = new ChatContext(this.editorEngine, this.projectsManager);
        this.conversation = new ConversationManager(this.editorEngine, this.projectsManager);
        this.stream = new StreamResolver();
        this.code = new ChatCodeManager(this, this.editorEngine, this.projectsManager);
        this.suggestions = new SuggestionManager(this.projectsManager);
        this.listen();
    }

    listen() {
        const disposer = reaction(
            () => this.stream.content,
            (content) => this.resolveStreamObject(content),
        );
        this.disposers.push(disposer);
    }

    focusChatInput() {
        window.dispatchEvent(new Event(FOCUS_CHAT_INPUT_EVENT));
    }

    resolveStreamObject(content: TextStreamPart<ToolSet>[] | null) {
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
        this.streamingMessage = new AssistantChatMessageImpl(content, true);
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
        sendAnalytics('send chat message', {
            content,
        });
        await this.sendChatToAi(StreamRequestType.CHAT, content);
    }

    async sendFixErrorToAi(errors: ParsedError[]): Promise<boolean> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return false;
        }

        const prompt = `How can I resolve these errors? If you propose a fix, please make it concise.`;
        const errorContexts = this.context.getMessageContext(errors);
        const projectContexts = this.context.getProjectContext();
        const userMessage = this.conversation.addUserMessage(prompt, [
            ...errorContexts,
            ...projectContexts,
        ]);
        this.conversation.current.updateName(errors[0].content);
        if (!userMessage) {
            console.error('Failed to add user message');
            return false;
        }
        sendAnalytics('send fix error chat message', {
            errors: errors.map((e) => e.content),
        });
        await this.sendChatToAi(StreamRequestType.ERROR_FIX, prompt);
        return true;
    }

    async sendChatToAi(requestType: StreamRequestType, userPrompt?: string): Promise<void> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return;
        }
        this.shouldAutoScroll = true;
        this.stream.clear();
        this.isWaiting = true;
        const messages = this.conversation.current.getMessagesForStream();
        const res: FullStreamResponse | RateLimitedStreamResponse | ErrorStreamResponse | null =
            await this.sendStreamRequest(messages, requestType);
        this.stream.clear();
        this.isWaiting = false;
        this.handleChatResponse(res, requestType, userPrompt);
        sendAnalytics('receive chat response');
    }

    sendStreamRequest(
        messages: CoreMessage[],
        requestType: StreamRequestType,
    ): Promise<FullStreamResponse | null> {
        const requestId = nanoid();
        return invokeMainChannel(MainChannels.SEND_CHAT_MESSAGES_STREAM, {
            messages,
            requestId,
            requestType,
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
        if (message.role !== ChatMessageRole.USER) {
            console.error('Can only edit user messages');
            return;
        }

        message.updateContent(content);
        this.conversation.current.removeAllMessagesAfter(message);
        this.sendChatToAi(StreamRequestType.CHAT);
        sendAnalytics('resubmit chat message');
    }

    async handleChatResponse(
        res: FullStreamResponse | RateLimitedStreamResponse | ErrorStreamResponse | null,
        requestType: StreamRequestType,
        userPrompt?: string,
    ) {
        if (!res || !this.conversation.current) {
            console.error('No response found');
            return;
        }
        if (res.type === 'rate-limited') {
            console.error('Rate limited in chat response', res.rateLimitResult);
            this.stream.errorMessage = res.rateLimitResult?.reason;
            this.stream.rateLimited = res.rateLimitResult ?? null;
            sendAnalytics('rate limited', {
                rateLimitResult: res.rateLimitResult,
            });
            return;
        }
        if (res.type === 'error') {
            console.error('Error found in chat response', res.message);
            if (isPromptTooLongError(res.message)) {
                this.stream.errorMessage = PROMPT_TOO_LONG_ERROR;
            } else {
                this.stream.errorMessage = res.message;
            }
            sendAnalytics('chat error', {
                content: res.message,
            });
            return;
        }

        if (res.usage) {
            this.conversation.current.updateTokenUsage(res.usage);
        }

        if (this.conversation.current.needsSummary()) {
            await this.conversation.generateConversationSummary();
        }

        const assistantMessage = this.conversation.addAssistantMessage(res);
        if (!assistantMessage) {
            console.error('Failed to add assistant message');
            return;
        }

        if (
            requestType === StreamRequestType.CHAT &&
            this.conversation.current?.messages &&
            this.conversation.current.messages.length > 0
        ) {
            this.suggestions.shouldHide = true;
            this.suggestions.generateNextSuggestions(this.conversation.current.messages);
        }

        this.context.clearAttachments();

        if (this.userManager.settings.settings?.chat?.autoApplyCode) {
            setTimeout(() => {
                this.code.applyCode(assistantMessage.id, userPrompt);
            }, 100);
        }
    }

    dispose() {
        // Clean up MobX reactions
        this.disposers.forEach((dispose) => dispose());
        this.disposers = [];

        // Clean up stream
        this.stream.clear();
        this.streamingMessage = null;

        // Clean up managers
        this.code?.dispose();
        this.context?.dispose();
        if (this.conversation) {
            this.conversation.current = null;
        }
    }
}
