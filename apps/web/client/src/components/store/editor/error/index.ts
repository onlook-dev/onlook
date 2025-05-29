import { type ParsedError, compareErrors, isErrorMessage, shouldIgnoreMessage, TerminalBuffer } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';

export class ErrorManager {
    private terminalErrors: ParsedError[] = [];
    hideErrors = false;
    private buffer: TerminalBuffer;

    constructor() {
        this.buffer = new TerminalBuffer(20);
        this.buffer.onError((lines) => {
            // Add all error lines to error state
            lines.forEach((line) => {
                if (!shouldIgnoreMessage(line) && isErrorMessage(line)) {
                    this.addError(line);
                }
            });
        });
        this.buffer.onSuccess(() => {
            this.addSuccess('Success detected in buffer');
        });

        makeAutoObservable(this);
    }

    get errors(): ParsedError[] {
        return [...this.terminalErrors];
    }

    processMessage(message: string) {
        // Always add to buffer, which will handle error/success detection
        this.buffer.addLine(message);
    }

    addError(message: string) {
        console.error('Terminal error message received', message);
        const error: ParsedError = {
            sourceId: 'Dev Server Error (CLI)',
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
