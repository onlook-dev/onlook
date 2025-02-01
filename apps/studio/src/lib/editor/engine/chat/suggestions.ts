import { invokeMainChannel, sendAnalytics } from '@/lib/utils';
import { MainChannels } from '@onlook/models/constants';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class SuggestionManager {
    _suggestions: string[] = ['Add a header', 'Add a text input', 'Add a footer'];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get suggestions() {
        return this._suggestions;
    }

    addSuggestion(suggestion: string) {
        this._suggestions.push(suggestion);
    }

    async generateSuggestions(content: string) {
        console.log('generateSuggestions', content);
        sendAnalytics('generate suggestions');

        // this.editorEngine.chat.context.addPrompt(suggestion);
        const newSuggestions: string[] | null = await invokeMainChannel(
            MainChannels.GENERATE_SUGGESTIONS,
            {
                content,
            },
        );
        if (newSuggestions) {
            this._suggestions = newSuggestions;
        } else {
            console.error('Failed to generate suggestions');
        }

        console.log('suggestions', this._suggestions);
    }
}
