import type { GitCommit } from '@onlook/git';
import { ChatMessageRole, type MessageContext, type UserChatMessage } from '@onlook/models/chat';
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

    async addEditMessage(content: string, contextOverride?: MessageContext[]): Promise<UserChatMessage> {
        const context = contextOverride ?? await this.context.getChatContext();
        const userMessage = await this.conversation.addUserMessage(content, context);
        this.createAndAttachCommitToUserMessage(userMessage.id, content);
        return userMessage;
    }

    async createAndAttachCommitToUserMessage(messageId: string, content: string): Promise<void> {
        const commit = await this.createCommit(content)
        if (commit) {
            await this.conversation.attachCommitToUserMessage(messageId, commit);
        }
    }

    async addAskMessage(content: string, contextOverride?: MessageContext[]): Promise<UserChatMessage> {
        const context = contextOverride ?? await this.context.getChatContext();
        const userMessage = await this.conversation.addUserMessage(content, context);
        return userMessage;
    }

    async addFixErrorMessage(): Promise<UserChatMessage> {
        const errors = this.editorEngine.error.errors;
        const prompt = `How can I resolve these errors? If you propose a fix, please make it concise.`;
        const errorContexts = this.context.getMessageContext(errors);
        const projectContexts = this.context.getProjectContext();
        const userMessage = await this.conversation.addUserMessage(prompt, [
            ...errorContexts,
            ...projectContexts,
        ]);
        return userMessage
    }

    async resubmitMessage(id: string, newMessageContent: string): Promise<UserChatMessage | null> {
        const oldMessageIndex = this.conversation.current?.messages.findIndex((m) => m.id === id && m.role === ChatMessageRole.USER);
        if (oldMessageIndex === undefined || oldMessageIndex === -1 || !this.conversation.current?.messages[oldMessageIndex]) {
            console.error('No message found with id', id);
            return null;
        }

        const oldMessage = this.conversation.current?.messages[oldMessageIndex] as UserChatMessage;

        // Update the old message with the new content
        const newContext = await this.context.getRefreshedContext(oldMessage.content.metadata.context);
        oldMessage.content.metadata.context = newContext;
        oldMessage.content.parts = [{ type: 'text', text: newMessageContent }];

        // Remove all messages after the old message
        const messagesToRemove = this.conversation.current?.messages.filter((m) => m.createdAt > oldMessage.createdAt);
        await this.conversation.removeMessages(messagesToRemove);
        return oldMessage;
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
