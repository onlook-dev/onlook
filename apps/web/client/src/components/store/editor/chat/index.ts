import type { SendMessage } from '@/app/project/[id]/_hooks/use-chat';
import { type ChatType } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { ChatContext } from './context';
import { ConversationManager } from './conversation';

export const FOCUS_CHAT_INPUT_EVENT = 'focus-chat-input';
export class ChatManager {
    conversation: ConversationManager;
    context: ChatContext;

    // Content sent from useChat hook
    _sendMessageAction: SendMessage | null = null;
    isStreaming = false;

    constructor(private editorEngine: EditorEngine) {
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
        this._sendMessageAction = sendMessage;
    }

    async sendMessage(content: string, type: ChatType): Promise<void> {
        if (!this._sendMessageAction) {
            throw new Error('Chat actions not initialized');
        }

        await this._sendMessageAction(content, type);
    }

    clear() {
        this.context.clear();
        this.conversation.clear();
    }
}
