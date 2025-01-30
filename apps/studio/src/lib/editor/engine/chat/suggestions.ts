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

    applySuggestion(suggestion: string) {
        // this.editorEngine.chat.context.addPrompt(suggestion);
    }
}
