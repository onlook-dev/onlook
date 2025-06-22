import type { ProjectManager } from '@/components/store/project/manager';
import type { UserManager } from '@/components/store/user/manager';
import { sendAnalytics } from '@/utils/analytics';
import { ChatMessageRole, StreamRequestType, type AssistantChatMessage, type ChatMessageContext } from '@onlook/models/chat';
import type { Message } from 'ai';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { ChatCodeManager } from './code';
import { ChatContext } from './context';
import { ConversationManager } from './conversation';
import { ChatErrorManager } from './error';
import { SuggestionManager } from './suggestions';

export const FOCUS_CHAT_INPUT_EVENT = 'focus-chat-input';

export class ChatManager {
    conversation: ConversationManager;
    code: ChatCodeManager;
    context: ChatContext;
    suggestions: SuggestionManager;
    error: ChatErrorManager;

    constructor(
        private editorEngine: EditorEngine,
        private projectManager: ProjectManager,
        private userManager: UserManager,
    ) {
        this.context = new ChatContext(this.editorEngine, this.projectManager);
        this.conversation = new ConversationManager(this, this.projectManager);
        this.code = new ChatCodeManager(this, this.editorEngine);
        this.suggestions = new SuggestionManager(this.projectManager);
        this.error = new ChatErrorManager();
        makeAutoObservable(this);
    }

    focusChatInput() {
        window.dispatchEvent(new Event(FOCUS_CHAT_INPUT_EVENT));
    }

    async getStreamMessages(content: string, contextOverride?: ChatMessageContext[]): Promise<Message[] | null> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return null;
        }

        const context = contextOverride ?? await this.context.getChatContext();
        const userMessage = this.conversation.addUserMessage(content, context);
        this.conversation.current.updateName(content);
        if (!userMessage) {
            console.error('Failed to add user message');
            return null;
        }
        sendAnalytics('send chat message', {
            content,
        });
        return this.generateStreamMessages(content);
    }

    async getFixErrorMessages(): Promise<Message[] | null> {
        const errors = this.editorEngine.error.errors;
        if (!this.conversation.current) {
            console.error('No conversation found');
            return null;
        }

        if (errors.length === 0) {
            console.error('No errors found');
            return null;
        }

        const prompt = `How can I resolve these errors? If you propose a fix, please make it concise.`;
        const errorContexts = this.context.getMessageContext(errors);
        const projectContexts = this.context.getProjectContext();
        const userMessage = this.conversation.addUserMessage(prompt, [
            ...errorContexts,
            ...projectContexts,
        ]);
        this.conversation.current.updateName(errors[0]?.content ?? 'Fix errors');
        if (!userMessage) {
            console.error('Failed to add user message');
            return null;
        }
        sendAnalytics('send fix error chat message', {
            errors: errors.map((e) => e.content),
        });
        return this.generateStreamMessages(prompt);
    }

    async getResubmitMessages(id: string, newMessageContent: string) {
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

        message.updateContent(newMessageContent);
        await this.conversation.current.removeAllMessagesAfter(message);
        await this.conversation.current.updateMessage(message);
        return this.generateStreamMessages(StreamRequestType.CHAT);
    }

    private async generateStreamMessages(userPrompt?: string): Promise<Message[] | null> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return null;
        }
        this.createCommit(userPrompt);
        return this.conversation.current.getMessagesForStream();
    }

    createCommit(userPrompt?: string) {
        // TODO: Reenable this
        // this.projectManager.versions?.createCommit(
        //     "Save before chat",
        //     false,
        // );
    }

    autoApplyCode(assistantMessage: AssistantChatMessage) {
        if (this.userManager.settings.settings?.chat?.autoApplyCode) {
            setTimeout(() => {
                this.code.applyCode(assistantMessage.id);
            }, 100);
        }
    }

    clear() {
        this.code.clear();
        this.context.clear();
        this.conversation.clear();
    }
}
