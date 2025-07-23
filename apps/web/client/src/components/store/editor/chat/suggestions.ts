
import { sendAnalytics } from '@/utils/analytics';
import type { ChatSuggestion, Project } from '@onlook/models';
import type { ImageMessageContext } from '@onlook/models/chat';
import type { CoreMessage, CoreSystemMessage, ImagePart, Message, TextPart } from 'ai';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { ChatType } from '@onlook/models/chat';
import { removeContextMessages } from '@onlook/ai/src/prompt/provider';
import { api } from '@/trpc/client';

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

    private async fetchSuggestions(messages: Message[]): Promise<ChatSuggestion[]> {
        try {
            const coreMessages = messages.map(msg => ({
                role: msg.role,
                content: msg.content,
            }));

            const suggestions = await api.chat.suggestions.generate.mutate({ 
                messages: coreMessages 
            });
            
            return suggestions;
        } catch (error) {
            console.error('Error fetching suggestions:', error);
            return [];
        }
    }

    async getNextSuggestionsMessages(): Promise<void> {
        const messages = this.editorEngine.chat.conversation.current?.messages ?? [];
        removeContextMessages(messages);
        
        this.setSendingMessage(false);
        this.isLoadingSuggestions = true;

        this.suggestions = await this.fetchSuggestions(messages);
        this.isLoadingSuggestions = false;
    }
}
