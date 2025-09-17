import type { SendMessage } from '@/app/project/[id]/_hooks/use-chat';
import type { GitCommit } from '@onlook/git';
import { ChatType } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { ChatContext } from './context';
import { ConversationManager } from './conversation';

export const FOCUS_CHAT_INPUT_EVENT = 'focus-chat-input';

const stubSendMessage: SendMessage = () => {
    throw new Error('Chat actions not initialized');
}

export class ChatManager {
    conversation: ConversationManager;
    context: ChatContext;
    isStreaming = false;

    // Actions pulled in from useChat hook
    sendMessage: SendMessage = stubSendMessage;

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

    setChatActions(sendMessage: SendMessage) {
        this.sendMessage = sendMessage;
    }

    async addEditMessage(content: string): Promise<void> {
        if (!this.sendMessage) {
            throw new Error('Chat actions not initialized');
        }
        const messageId = await this.sendMessage(content, ChatType.EDIT);
        await this.createAndAttachCommitToUserMessage(messageId, content);
    }

    async addAskMessage(content: string): Promise<void> {
        if (!this.sendMessage) {
            throw new Error('Chat actions not initialized');
        }
        await this.sendMessage(content, ChatType.ASK);
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
