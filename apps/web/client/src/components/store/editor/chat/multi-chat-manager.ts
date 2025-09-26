import { type ChatConversation } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export type ChatStatus = 'inactive' | 'loading' | 'unread' | 'pending' | 'error';

export interface ActiveChat {
    id: string;
    conversation: ChatConversation;
    status: ChatStatus;
    lastActivity: Date;
}

export class MultiChatManager {
    private _activeChats: Map<string, ActiveChat> = new Map();
    private _selectedChatId: string | null = null;
    private _archivedChats: Set<string> = new Set();
    private readonly MAX_ACTIVE_CHATS = 3;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get activeChats(): ActiveChat[] {
        // Preserve insertion order; do not reorder on selection/activity
        return Array.from(this._activeChats.values())
            .filter(chat => !this._archivedChats.has(chat.id));
    }

    get selectedChatId(): string | null {
        return this._selectedChatId;
    }

    get selectedChat(): ActiveChat | null {
        if (!this._selectedChatId) return null;
        return this._activeChats.get(this._selectedChatId) || null;
    }

    get archivedChats(): string[] {
        return Array.from(this._archivedChats);
    }

    get canAddNewChat(): boolean {
        return this.activeChats.length < this.MAX_ACTIVE_CHATS || this._archivedChats.size > 0;
    }

    get hasMoreChatsToShow(): boolean {
        return this.activeChats.length < this.MAX_ACTIVE_CHATS || this._archivedChats.size > 0;
    }

    async addChat(conversation: ChatConversation): Promise<string> {
        // If we have archived chats, restore the first one
        if (this._archivedChats.size > 0) {
            const archivedChatId = Array.from(this._archivedChats)[0];
            if (archivedChatId) {
                this._archivedChats.delete(archivedChatId);
                
                // Update the conversation data
                const existingChat = this._activeChats.get(archivedChatId);
                if (existingChat) {
                    existingChat.conversation = conversation;
                    existingChat.lastActivity = new Date();
                    existingChat.status = 'inactive';
                }
                
                this._selectedChatId = archivedChatId;
                return archivedChatId;
            }
        }

        // If we're at max capacity, archive the least recently active chat
        if (this.activeChats.length >= this.MAX_ACTIVE_CHATS) {
            const leastRecent = this.activeChats.reduce<ActiveChat | null>((acc, curr) => {
                if (!acc) return curr;
                return curr.lastActivity.getTime() < acc.lastActivity.getTime() ? curr : acc;
            }, null);
            if (leastRecent) {
                this.archiveChat(leastRecent.id);
            }
        }

        // Add new chat
        const chatId = conversation.id;
        const activeChat: ActiveChat = {
            id: chatId,
            conversation,
            status: 'inactive',
            lastActivity: new Date(),
        };

        this._activeChats.set(chatId, activeChat);
        this._selectedChatId = chatId;
        
        return chatId;
    }

    selectChat(chatId: string): void {
        if (this._activeChats.has(chatId) && !this._archivedChats.has(chatId)) {
            this._selectedChatId = chatId;
            // Mark as read when selected
            this.setChatStatus(chatId, 'inactive');
        }
    }

    archiveChat(chatId: string): void {
        if (this._activeChats.has(chatId)) {
            this._archivedChats.add(chatId);
            
            // If we archived the selected chat, select another one
            if (this._selectedChatId === chatId) {
                const availableChats = this.activeChats.filter(chat => chat.id !== chatId);
                this._selectedChatId = availableChats.length > 0 ? availableChats[0].id : null;
            }
        }
    }

    setChatStatus(chatId: string, status: ChatStatus): void {
        const chat = this._activeChats.get(chatId);
        if (chat) {
            chat.status = status;
            chat.lastActivity = new Date();
        }
    }

    updateChatConversation(chatId: string, conversation: ChatConversation): void {
        const chat = this._activeChats.get(chatId);
        if (chat) {
            chat.conversation = conversation;
            chat.lastActivity = new Date();
        }
    }

    getChatById(chatId: string): ActiveChat | null {
        return this._activeChats.get(chatId) || null;
    }

    getChatStatus(chatId: string): ChatStatus {
        const chat = this._activeChats.get(chatId);
        return chat?.status || 'inactive';
    }

    // Keyboard navigation
    selectChatByIndex(index: number): void {
        const availableChats = this.activeChats;
        if (index >= 0 && index < availableChats.length) {
            this.selectChat(availableChats[index].id);
        }
    }

    // Cycle selection forward (Tab) and backward (Shift+Tab)
    selectNextChat(): void {
        const list = this.activeChats;
        if (list.length === 0) return;
        const currentIndex = list.findIndex(c => c.id === this._selectedChatId);
        const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % list.length;
        this.selectChat(list[nextIndex]!.id);
    }

    selectPrevChat(): void {
        const list = this.activeChats;
        if (list.length === 0) return;
        const currentIndex = list.findIndex(c => c.id === this._selectedChatId);
        const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + list.length) % list.length;
        this.selectChat(list[prevIndex]!.id);
    }

    // Clear all chats
    clear(): void {
        this._activeChats.clear();
        this._selectedChatId = null;
        this._archivedChats.clear();
    }

    // Initialize with existing conversation
    async initializeWithCurrentConversation(): Promise<void> {
        const currentConversation = this.editorEngine.chat.conversation.current;
        if (currentConversation) {
            await this.addChat(currentConversation);
        }
    }
}
