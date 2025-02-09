import type { ProjectsManager } from '@/lib/projects';
import type { ErrorMessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { type ParsedError, compareErrors } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class ErrorManager {
    private webviewIdToError: Record<string, ParsedError[]> = {};
    shouldShowErrors: boolean = false;

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this, {});
    }

    get errors() {
        return Array.from(Object.values(this.webviewIdToError)).flat();
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
            message: event.message,
        };
        const existingErrors = this.webviewIdToError[webviewId] || [];
        if (!existingErrors.some((e) => compareErrors(e, error))) {
            this.webviewIdToError[webviewId] = [...existingErrors, error];
        }
    }

    getMessageContext(errors: ParsedError[]): ErrorMessageContext {
        const content = errors.map((e) => e.message).join('\n');
        return {
            type: MessageContextType.ERROR,
            content,
            displayName: 'Error',
        };
    }

    clearErrors(webviewId: string) {
        delete this.webviewIdToError[webviewId];
    }

    clear() {
        this.webviewIdToError = {};
    }
}
