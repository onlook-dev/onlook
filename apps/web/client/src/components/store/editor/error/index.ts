import type { ProjectManager } from '@/components/store/project/manager';
import { type ParsedError, compareErrors } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';

export class ErrorManager {
    private terminalErrors: ParsedError[] = [];
    hideErrors = false;

    constructor(
        private editorEngine: EditorEngine,
        private projectManager: ProjectManager,
    ) {
        makeAutoObservable(this);
    }

    get errors() {
        return [...this.terminalErrors];
    }

    removeErrorsFromMap(errors: ParsedError[]) {

    }

    addError(message: string) {
        const error: ParsedError = {
            sourceId: 'terminal',
            type: 'terminal',
            content: message,
        };
        const existingErrors = this.terminalErrors || [];
        if (!existingErrors.some((e) => compareErrors(e, error))) {
            this.terminalErrors = [...existingErrors, error];
        }
        this.hideErrors = false;
    }

    addSuccess(message: string) {
        console.log('addSuccess', message);
        // Should clear errors
        // this.terminalErrors = [];
    }

    clear() {
        this.terminalErrors = [];
    }
}
