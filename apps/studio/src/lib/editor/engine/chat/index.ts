import type { ProjectsManager } from '@/lib/projects';
import type { UserManager } from '@/lib/user';
import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import {
    ChatMessageRole,
    StreamRequestType,
    type AssistantChatMessage,
    type CompletedStreamResponse,
    type ErrorStreamResponse,
    type RateLimitedStreamResponse,
} from '@onlook/models/chat';
import { MainChannels } from '@onlook/models/constants';
import type { ParsedError } from '@onlook/utility';
import type { CoreMessage } from 'ai';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import type { EditorEngine } from '..';
import { ChatCodeManager } from './code';
import { ChatContext } from './context';
import { ConversationManager } from './conversation';
import { isPromptTooLongError, PROMPT_TOO_LONG_ERROR } from './helpers';
import { StreamResolver } from './stream';
import { SuggestionManager } from './suggestions';

export const FOCUS_CHAT_INPUT_EVENT = 'focus-chat-input';

export class ChatManager {
    isWaiting = false;
    conversation: ConversationManager;
    code: ChatCodeManager;
    context: ChatContext;
    stream: StreamResolver;
    suggestions: SuggestionManager;

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
    }

    focusChatInput() {
        window.dispatchEvent(new Event(FOCUS_CHAT_INPUT_EVENT));
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
        this.stream.clear();
        this.isWaiting = true;
        const messages = this.conversation.current.getMessagesForStream();
        const res: CompletedStreamResponse | null = await this.sendStreamRequest(
            messages,
            requestType,
        );
        this.stream.clear();
        this.isWaiting = false;
        if (res) {
            this.handleChatResponse(res, requestType, userPrompt);
        } else {
            console.error('No stream response found');
        }
        sendAnalytics('receive chat response');
    }

    sendStreamRequest(
        messages: CoreMessage[],
        requestType: StreamRequestType,
    ): Promise<CompletedStreamResponse | null> {
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

    resubmitMessage(id: string, newMessageContent: string) {
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

        message.updateStringContent(newMessageContent);
        this.conversation.current.removeAllMessagesAfter(message);
        this.sendChatToAi(StreamRequestType.CHAT);
        sendAnalytics('resubmit chat message');
    }

    async handleChatResponse(
        res: CompletedStreamResponse,
        requestType: StreamRequestType,
        userPrompt?: string,
    ) {
        if (!res || !this.conversation.current) {
            console.error('No response found');
            return;
        }

        if (res.type === 'rate-limited') {
            this.handleRateLimited(res);
            return;
        } else if (res.type === 'error') {
            this.handleError(res);
            return;
        }

        if (res.usage) {
            this.conversation.current.updateTokenUsage(res.usage);
        }

        if (this.conversation.current.needsSummary()) {
            await this.conversation.generateConversationSummary();
        }

        this.handleNewCoreMessages(res.payload, userPrompt);

        if (
            requestType === StreamRequestType.CHAT &&
            this.conversation.current?.messages &&
            this.conversation.current.messages.length > 0
        ) {
            this.suggestions.shouldHide = true;
            this.suggestions.generateNextSuggestions(
                this.conversation.current.getMessagesForStream(),
            );
        }

        this.context.clearAttachments();
    }

    handleNewCoreMessages(messages: CoreMessage[], userPrompt?: string) {
        for (const message of messages) {
            if (message.role === ChatMessageRole.ASSISTANT) {
                const assistantMessage = this.conversation.addCoreAssistantMessage(message);
                if (!assistantMessage) {
                    console.error('Failed to add assistant message');
                } else {
                    this.autoApplyCode(assistantMessage, userPrompt);
                }
            } else if (message.role === ChatMessageRole.USER) {
                const userMessage = this.conversation.addCoreUserMessage(message);
                if (!userMessage) {
                    console.error('Failed to add user message');
                }
            }
        }
    }

    autoApplyCode(assistantMessage: AssistantChatMessage, userPrompt?: string) {
        if (this.userManager.settings.settings?.chat?.autoApplyCode) {
            setTimeout(() => {
                this.code.applyCode(assistantMessage.id, userPrompt);
            }, 100);
        }
    }

    handleRateLimited(res: RateLimitedStreamResponse) {
        this.stream.errorMessage = res.rateLimitResult?.reason;
        this.stream.rateLimited = res.rateLimitResult ?? null;
        sendAnalytics('rate limited', {
            rateLimitResult: res.rateLimitResult,
        });
    }

    handleError(res: ErrorStreamResponse) {
        console.error('Error found in chat response', res.message);
        if (isPromptTooLongError(res.message)) {
            this.stream.errorMessage = PROMPT_TOO_LONG_ERROR;
        } else {
            this.stream.errorMessage = res.message;
        }
        sendAnalytics('chat error', {
            content: res.message,
        });
    }

    dispose() {
        this.stream.clear();
        this.code?.dispose();
        this.context?.dispose();
        if (this.conversation) {
            this.conversation.current = null;
        }
    }
}
