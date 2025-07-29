import { api } from '@/trpc/client';
import { removeContextMessages } from '@onlook/ai/src/prompt/provider';
import type { ChatSuggestion } from '@onlook/models';
import type { Message } from 'ai';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export class SuggestionManager {
    shouldHide = false;
    isSendingMessage = false;
    isLoadingSuggestions = false;
    private _suggestions: ChatSuggestion[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get suggestions() {
        return this._suggestions || [];
    }

    set suggestions(suggestions: ChatSuggestion[]) {
        this._suggestions = suggestions;
    }

    setSendingMessage(isSending: boolean) {
        this._suggestions = [];
        this.isSendingMessage = isSending;
    }

    private async generateSuggestions(conversationId: string, messages: Message[]): Promise<ChatSuggestion[]> {
        try {
            const coreMessages = messages.map(msg => ({
                role: msg.role,
                content: msg.content,
            }));

            const suggestions = await api.chat.suggestions.generate.mutate({
                conversationId,
                messages: coreMessages
            });

            return suggestions;
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            return [];
        }
    }

    async getNextSuggestionsMessages(): Promise<void> {
        if (!this.editorEngine.chat.conversation.current) {
            throw new Error('No conversation id');
        }

        // Limit to last 5 messages
        const messages = this.editorEngine.chat.conversation.current.messages.slice(-5);
        removeContextMessages(messages);

        this.setSendingMessage(false);
        this.isLoadingSuggestions = true;

        this.suggestions = await this.generateSuggestions(this.editorEngine.chat.conversation.current.id, messages);
        this.isLoadingSuggestions = false;
    }
}
