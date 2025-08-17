import { api } from '@/trpc/client';
import type { ChatSuggestion } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export class SuggestionManager {
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

    async generateSuggestions(): Promise<void> {
        if (!this.editorEngine.chat.conversation.current) {
            throw new Error('No conversation id');
        }

        // Limit to last 5 messages
        const messages = this.editorEngine.chat.conversation.current.messages.slice(-5);
        const conversationId = this.editorEngine.chat.conversation.current.conversation.id;

        this.isLoadingSuggestions = true;

        const coreMessages = messages.map(msg => ({
            role: msg.role,
            content: msg.content.parts.map((p) => {
                if (p.type === 'text') {
                    return p.text;
                }
                return '';
            }).join(''),
        }));

        this.suggestions = await api.chat.suggestions.generate.mutate({
            conversationId,
            messages: coreMessages
        });

        this.isLoadingSuggestions = false;
    }
}
