import type { ProjectManager } from '@/components/store/project/manager';
import { type ParsedError, compareErrors } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export class ErrorManager {
    private frameIdToError: Record<string, ParsedError[]> = {};
    private terminalErrors: ParsedError[] = [];

    shouldShowErrean = false;

    constructor(
        private editorEngine: EditorEngine,
        private projectManager: ProjectManager,
    ) {
        makeAutoObservable(this);
    }

    get errors() {
        return [...this.terminalErrors];
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
        for (const [frameId, existingErrors] of Object.entries(this.frameIdToError)) {
            this.frameIdToError[frameId] = existingErrors.filter(
                (existing) => !errors.some((error) => compareErrors(existing, error)),
            );
        }
    }

    errorByWebviewId(frameId: string) {
        return this.frameIdToError[frameId];
    }

    addError(frameId: string, event: Electron.ConsoleMessageEvent) {
        if (event.sourceId?.includes('localhost')) {
            return;
        }
        const error: ParsedError = {
            sourceId: event.sourceId,
            type: 'frameView',
            content: event.message,
        };
        const existingErrors = this.frameIdToError[frameId] || [];
        if (!existingErrors.some((e) => compareErrors(e, error))) {
            this.frameIdToError[frameId] = [...existingErrors, error];
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

    clear() {
        this.frameIdToError = {};
        this.terminalErrors = [];
    }
}
