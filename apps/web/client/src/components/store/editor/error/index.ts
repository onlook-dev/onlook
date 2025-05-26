import { type ParsedError, compareErrors } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';

export class ErrorManager {
    private terminalErrors: ParsedError[] = [];
    hideErrors = false;

    constructor() {
        makeAutoObservable(this);
    }

    get errors() {
        return [...this.terminalErrors];
    }

    addError(message: string) {
        console.warn('Terminal error message received', message);
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
        console.log('Success message received, clearing errors', message);
        this.clearTerminalErrors();
    }

    clearTerminalErrors() {
        this.terminalErrors = [];
    }

    clear() {
        this.terminalErrors = [];
    }
}
