import type { ParsedError } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class ErrorManager {
    private webviewIdToError: Record<string, ParsedError[]> = {};

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this, {});
    }

    get errors() {
        return Array.from(Object.values(this.webviewIdToError));
    }

    errorByWebviewId(webviewId: string) {
        return this.webviewIdToError[webviewId];
    }

    addError(webviewId: string, error: ParsedError) {
        this.webviewIdToError[webviewId] = [...(this.webviewIdToError[webviewId] || []), error];
    }

    removeWebview(webviewId: string) {
        delete this.webviewIdToError[webviewId];
    }

    createChatMessage(error: ParsedError) {
        const messages = [{ role: 'user', content: error.message }];
        return messages;
    }

    clear() {
        this.webviewIdToError = {};
    }
}
