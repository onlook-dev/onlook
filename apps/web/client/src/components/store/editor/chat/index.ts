import { api } from '@/trpc/client';
import type { GitCommit } from '@onlook/git';
import { MessageCheckpointType, type ChatMessage, type MessageContext } from '@onlook/models/chat';
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

    init() {
        this.context.init();
    }

    focusChatInput() {
        window.dispatchEvent(new Event(FOCUS_CHAT_INPUT_EVENT));
    }

    getCurrentConversationId() {
        return this.conversation.current?.conversation.id;
    }

    async addEditMessage(content: string, contextOverride?: MessageContext[]): Promise<ChatMessage> {
        const context = contextOverride ?? await this.context.getChatContext();
        const userMessage = await this.conversation.addUserMessage(content, context);
        this.createAndAttachCommitToUserMessage(userMessage.id, content);
        return userMessage;
    }

    async createAndAttachCommitToUserMessage(messageId: string, content: string): Promise<void> {
        const commit = await this.createCommit(content)
        if (commit) {
            await this.attachCommitToUserMessage(messageId, commit);
        }
    }

    async attachCommitToUserMessage(id: string, commit: GitCommit): Promise<void> {
        if (!this.conversation.current) {
            console.error('No conversation found');
            return;
        }
        const message = this.conversation.current?.messages.find((m) => m.id === id && m.role === 'user');
        if (!message) {
            console.error('No message found with id', id);
            return;
        }
        const newCheckpoints = [
            ...(message.metadata?.checkpoints ?? []),
            {
                type: MessageCheckpointType.GIT,
                oid: commit.oid,
                createdAt: new Date(),
            },
        ];
        message.metadata = {
            ...message.metadata,
            createdAt: message.metadata?.createdAt ?? new Date(),
            conversationId: message.metadata?.conversationId || this.conversation.current.conversation.id,
            checkpoints: newCheckpoints,
            context: message.metadata?.context ?? [],
        };
        await api.chat.message.updateCheckpoints.mutate({
            messageId: message.id,
            checkpoints: newCheckpoints,
        });
        await this.conversation.addOrReplaceMessage(message);
    }

    async addAskMessage(content: string, contextOverride?: MessageContext[]): Promise<ChatMessage> {
        const context = contextOverride ?? await this.context.getChatContext();
        const userMessage = await this.conversation.addUserMessage(content, context);
        return userMessage;
    }

    async addFixErrorMessage(): Promise<ChatMessage> {
        const errors = this.editorEngine.branches.getAllErrors();
        const prompt = `How can I resolve these errors? If you propose a fix, please make it concise.`;
        const errorContexts = this.context.getErrorContext(errors);
        const projectContexts = this.context.getProjectContext();
        const userMessage = await this.conversation.addUserMessage(prompt, [
            ...errorContexts,
            ...projectContexts,
        ]);
        return userMessage
    }

    async resubmitMessage(id: string, newMessageContent: string): Promise<ChatMessage | null> {
        if (!this.conversation.current?.conversation.id) {
            console.error('No conversation found');
            return null;
        }
        const oldMessageIndex = this.conversation.current?.messages.findIndex((m) => m.id === id && m.role === 'user');
        if (oldMessageIndex === undefined || oldMessageIndex === -1 || !this.conversation.current?.messages[oldMessageIndex]) {
            console.error('No message found with id', id);
            return null;
        }

        const oldMessage = this.conversation.current?.messages[oldMessageIndex];

        // Update the old message with the new content
        const newContext = await this.context.getRefreshedContext(oldMessage.metadata?.context ?? []);
        oldMessage.metadata = {
            ...oldMessage.metadata,
            context: newContext,
            createdAt: oldMessage.metadata?.createdAt || new Date(),
            conversationId: oldMessage.metadata?.conversationId || this.conversation.current?.conversation.id,
            checkpoints: oldMessage.metadata?.checkpoints ?? [],
        };
        oldMessage.parts = [{ type: 'text', text: newMessageContent }];

        // Remove all messages after the old message
        const messagesToRemove = this.conversation.current?.messages.filter((m) => m.metadata?.createdAt && m.metadata.createdAt > (oldMessage.metadata?.createdAt ?? new Date()));
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
