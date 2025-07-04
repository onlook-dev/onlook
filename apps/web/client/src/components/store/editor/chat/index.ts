import { sendAnalytics } from '@/utils/analytics';
import type { GitCommit } from '@onlook/git';
import { ChatMessageRole, type ChatMessageContext } from '@onlook/models/chat';
import type { Message } from 'ai';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { ChatContext } from './context';
import { ConversationManager } from './conversation';
import { ChatErrorManager } from './error';
import { SuggestionManager } from './suggestions';

export const FOCUS_CHAT_INPUT_EVENT = 'focus-chat-input';

export class ChatManager {
    conversation: ConversationManager;
    context: ChatContext;
    suggestions: SuggestionManager;
    error: ChatErrorManager;

    constructor(
        private editorEngine: EditorEngine,
    ) {
        this.context = new ChatContext(this.editorEngine);
        this.conversation = new ConversationManager(this.editorEngine);
        this.suggestions = new SuggestionManager(this.editorEngine);
        this.error = new ChatErrorManager();
        makeAutoObservable(this);
    }

    focusChatInput() {
        window.dispatchEvent(new Event(FOCUS_CHAT_INPUT_EVENT));
    }

    async getEditMessages(content: string, contextOverride?: ChatMessageContext[]): Promise<Message[] | null> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return null;
        }

        const context = contextOverride ?? await this.context.getChatContext();
        const userMessage = await this.conversation.addUserMessage(content, context);

        this.conversation.current.updateName(content);
        if (!userMessage) {
            console.error('Failed to add user message');
            return null;
        }
        this.createCommit(content).then((commit) => {
            if (commit) {
                this.conversation.attachCommitToUserMessage(userMessage.id, commit);
            }
        });
        return this.generateStreamMessages();
    }

    async getAskMessages(content: string, contextOverride?: ChatMessageContext[]): Promise<Message[] | null> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return null;
        }

        const context = contextOverride ?? await this.context.getChatContext();
        const userMessage = await this.conversation.addUserMessage(content, context);

        this.conversation.current.updateName(content);
        if (!userMessage) {
            console.error('Failed to add user message');
            return null;
        }
        return this.generateStreamMessages();
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
        return this.generateStreamMessages();
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

        const newContext = await this.context.getRefreshedContext(message.context);
        message.updateMessage(newMessageContent, newContext);

        await this.conversation.current.removeAllMessagesAfter(message);
        await this.conversation.current.updateMessage(message);
        return this.generateStreamMessages();
    }

    private async generateStreamMessages(): Promise<Message[] | null> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return null;
        }
        return this.conversation.current.getMessagesForStream();
    }

    async createCommit(userPrompt: string): Promise<GitCommit | null> {
        const res = await this.editorEngine.versions?.createCommit(
            userPrompt ?? "Save before chat",
            false,
        );
        return res?.commit ?? null;
    }

    clear() {
        this.context.clear();
        this.conversation.clear();
    }
}
