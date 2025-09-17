import type { GitCommit } from '@onlook/git';
import { ChatType, type ChatMessage, type MessageContext } from '@onlook/models/chat';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { ChatContext } from './context';
import { ConversationManager } from './conversation';

export const FOCUS_CHAT_INPUT_EVENT = 'focus-chat-input';

export class ChatManager {
    conversation: ConversationManager;
    context: ChatContext;
    // Data pulled in from useChat hook
    sendMessage: ((content: string, type: ChatType, context?: MessageContext[]) => Promise<ChatMessage>) | null = null;
    editMessage: ((messageId: string, newContent: string) => Promise<ChatMessage>) | null = null;
    isStreaming = false;

    constructor(
        private editorEngine: EditorEngine,
    ) {
        this.context = new ChatContext(this.editorEngine);
        this.conversation = new ConversationManager(this.editorEngine);
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

    setIsStreaming(isStreaming: boolean) {
        this.isStreaming = isStreaming;
    }

    setChatActions(actions: {
        sendMessage: (content: string, type: ChatType, context?: MessageContext[]) => Promise<void>;
        editMessage: (messageId: string, newContent: string) => Promise<void>;
    } | null) {
        this.sendMessage = actions?.sendMessage ?? null;
        this.editMessage = actions?.editMessage ?? null;
    }

    async addEditMessage(content: string, contextOverride?: MessageContext[]): Promise<void> {
        if (!this.sendMessage) {
            throw new Error('Chat actions not initialized');
        }
        const context = contextOverride ?? await this.context.getChatContext();
        
        const commit = await this.createCommit(content);
        const message = await this.sendMessage(content, ChatType.EDIT, context);
        await this.createAndAttachCommitToUserMessage(message.id, content);
    }

    async createAndAttachCommitToUserMessage(messageId: string, content: string): Promise<void> {
        const commit = await this.createCommit(content)
        if (commit) {
            await this.conversation.attachCommitToUserMessage(messageId, commit);
        }
    }

    async addAskMessage(content: string, contextOverride?: MessageContext[]): Promise<void> {
        if (!this.sendMessage) {
            throw new Error('Chat actions not initialized');
        }
        const context = contextOverride ?? await this.context.getChatContext();
        await this.sendMessage(content, ChatType.ASK, context);
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
