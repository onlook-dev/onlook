import type { GitCommit } from '@onlook/git';
import { type ChatMessageContext, type UserChatMessage } from '@onlook/models/chat';
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

    getCurrentConversationId() {
        return this.conversation.current?.conversation.id;
    }

    async getEditMessage(content: string, contextOverride?: ChatMessageContext[]): Promise<UserChatMessage | null> {
        try {
            const context = contextOverride ?? await this.context.getChatContext();
            const userMessage = await this.conversation.addUserMessage(content, context);
            if (!userMessage) {
                console.error('Failed to add user message');
                return null;
            }
            this.createCommit(content).then((commit) => {
                if (commit) {
                    this.conversation.attachCommitToUserMessage(userMessage.id, commit);
                }
            });
            return userMessage;
        } catch (error) {
            console.error('Error getting edit message', error);
            return null;
        }
    }

    async getAskMessage(content: string, contextOverride?: ChatMessageContext[]): Promise<UserChatMessage | null> {
        try {
            const context = contextOverride ?? await this.context.getChatContext();
            const userMessage = await this.conversation.addUserMessage(content, context);
            if (!userMessage) {
                console.error('Failed to add user message');
                return null;
            }
            return userMessage;
        } catch (error) {
            console.error('Error getting ask message', error);
            return null;
        }
    }

    async getFixErrorMessage(): Promise<UserChatMessage | null> {
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
        const userMessage = await this.conversation.addUserMessage(prompt, [
            ...errorContexts,
            ...projectContexts,
        ]);
        if (!userMessage) {
            console.error('Failed to add user message');
            return null;
        }
        return userMessage
    }

    async getResubmitMessage(id: string, newMessageContent: string): Promise<UserChatMessage | null> {
        // TODO: implement
        return null;

        // const message = this.conversation.current?.messages.find((m) => m.id === id);
        // if (!message) {
        //     console.error('No message found with id', id);
        //     return;
        // }
        // if (message.role !== ChatMessageRole.USER) {
        //     console.error('Can only edit user messages');
        //     return;
        // }

        // const newContext = await this.context.getRefreshedContext(message.context);
        // message.updateMessage(newMessageContent, newContext);

        // await this.conversation.current.removeAllMessagesAfter(message);
        // await this.conversation.current.updateMessage(message);
        // return this.generateStreamMessages();
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
