import type { ProjectsManager } from '@/lib/projects';
import type { ErrorMessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { type ParsedError, compareErrors } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class ErrorManager {
    private webviewIdToError: Record<string, ParsedError[]> = {};
    private terminalErrors: ParsedError[] = [];

    shouldShowErrors: boolean = false;

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this, {});
    }

    get errors() {
        const webviewErrors = Array.from(Object.values(this.webviewIdToError)).flat();
        return [...webviewErrors, ...this.terminalErrors];
    }

    async sendFixError() {
        if (this.errors.length > 0) {
            const res = await this.editorEngine.chat.sendFixErrorToAi(this.errors);
            if (res) {
                this.removeErrorsFromMap(this.errors);
            }
        }
    }

    removeErrorsFromMap(errors: ParsedError[]) {
        for (const [webviewId, existingErrors] of Object.entries(this.webviewIdToError)) {
            this.webviewIdToError[webviewId] = existingErrors.filter(
                (existing) => !errors.some((error) => compareErrors(existing, error)),
            );
        }
    }

    errorByWebviewId(webviewId: string) {
        return this.webviewIdToError[webviewId];
    }

    addError(webviewId: string, event: Electron.ConsoleMessageEvent) {
        if (event.sourceId?.includes('localhost')) {
            return;
        }
        const error: ParsedError = {
            sourceId: event.sourceId,
            type: 'webview',
            content: event.message,
        };
        const existingErrors = this.webviewIdToError[webviewId] || [];
        if (!existingErrors.some((e) => compareErrors(e, error))) {
            this.webviewIdToError[webviewId] = [...existingErrors, error];
        }
    }

    addTerminalError(message: string) {
        const error: ParsedError = {
            sourceId: 'terminal',
            type: 'terminal',
            content: message,
        };
        const existingErrors = this.terminalErrors || [];
        if (!existingErrors.some((e) => compareErrors(e, error))) {
            this.terminalErrors = [...existingErrors, error];
        }
        this.shouldShowErrors = true;
    }

    getMessageContext(errors: ParsedError[]): ErrorMessageContext {
        // TODO: Handle these better
        const content = errors
            .map((e) => `Source: ${e.sourceId}\nContent: ${e.content}`)
            .join('\n');
        return {
            type: MessageContextType.ERROR,
            content,
            displayName: 'Error',
        };
    }

    clear() {
        this.webviewIdToError = {};
        this.terminalErrors = [];
    }
}
