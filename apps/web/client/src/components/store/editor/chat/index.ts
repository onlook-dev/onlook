import type { SendMessage } from '@/app/project/[id]/_hooks/use-chat';
import { type ChatType } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { ChatContext } from './context';
import { ConversationManager } from './conversation';
import { MultiChatManager } from './multi-chat-manager';

export const FOCUS_CHAT_INPUT_EVENT = 'focus-chat-input';
export class ChatManager {
    conversation: ConversationManager;
    context: ChatContext;
    multiChat: MultiChatManager;

    // Content sent from useChat hook
    _sendMessageAction: SendMessage | null = null;
    isStreaming = false;
    private _streamingConversations: Set<string> = new Set();

    constructor(private editorEngine: EditorEngine) {
        this.context = new ChatContext(this.editorEngine);
        this.conversation = new ConversationManager(this.editorEngine);
        this.multiChat = new MultiChatManager(this.editorEngine);
        makeAutoObservable(this);
    }

    init() {
        this.context.init();
        this.multiChat.initializeWithCurrentConversation();
    }

    focusChatInput() {
        window.dispatchEvent(new Event(FOCUS_CHAT_INPUT_EVENT));
    }

    getCurrentConversationId() {
        return this.conversation.current?.id;
    }

    setIsStreaming(isStreaming: boolean, conversationId?: string) {
        this.isStreaming = isStreaming;
        
        if (conversationId) {
            if (isStreaming) {
                this._streamingConversations.add(conversationId);
            } else {
                this._streamingConversations.delete(conversationId);
            }
        }
    }

    isConversationStreaming(conversationId: string): boolean {
        return this._streamingConversations.has(conversationId);
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
        this.multiChat.clear();
    }
}
