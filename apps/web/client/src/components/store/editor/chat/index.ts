import type { SendMessage } from '@/app/project/[id]/_hooks/use-chat';
import type { GitCommit } from '@onlook/git';
import { ChatType } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { ChatContext } from './context';
import { ConversationManager } from './conversation';

export const FOCUS_CHAT_INPUT_EVENT = 'focus-chat-input';
export class ChatManager {
    conversation: ConversationManager;
    context: ChatContext;
    isStreaming = false;

    // Actions pulled in from useChat hook
    private chatSendMessage: SendMessage | null = null;

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
        return this.conversation.current?.id;
    }

    setIsStreaming(isStreaming: boolean) {
        this.isStreaming = isStreaming;
    }

    setChatActions(sendMessage: SendMessage) {
        this.chatSendMessage = sendMessage;
    }

    async sendMessage(content: string, type: ChatType): Promise<void> {
        if (!this.chatSendMessage) {
            throw new Error('Chat actions not initialized');
        }

        const messageId = await this.chatSendMessage(content, type);
        if (type !== ChatType.ASK) {
            await this.createAndAttachCommitToUserMessage(messageId, content);
        }
    }

    async createAndAttachCommitToUserMessage(messageId: string, content: string): Promise<void> {
        const commit = await this.createCommit(content)
        if (commit) {
            await this.conversation.attachCommitToUserMessage(messageId, commit);
        }
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
