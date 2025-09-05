import type { Action, Branch } from '@onlook/models';
import { type ParsedError, compareErrors, isErrorMessage, shouldIgnoreMessage, TerminalBuffer } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';

export class ErrorManager {
    private _errors: ParsedError[] = [];
    private buffer: TerminalBuffer;

    constructor(private readonly branch: Branch) {
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
            this.handleSuccess('Success detected in buffer');
        });

        makeAutoObservable(this);
    }

    get errors(): ParsedError[] {
        return this._errors;
    }

    processMessage(message: string) {
        // Always add to buffer, which will handle error/success detection
        this.buffer.addLine(message);
    }

    addError(message: string) {
        const error: ParsedError = {
            sourceId: 'Dev Server Error (CLI)',
            type: 'terminal',
            content: message,
            branchId: this.branch.id,
            branchName: this.branch.name,
        };
        const existingErrors = this._errors || [];
        if (!existingErrors.some((e) => compareErrors(e, error))) {
            this._errors = [...existingErrors, error];
        }
    }

    addCodeApplicationError(message: string, metadata: Action | Object) {
        const sourceId = 'Write Code Error';
        const content = `Failed to apply code block with error: ${message}. The intended action metadata was: ${JSON.stringify(metadata)}`;
        const error: ParsedError = {
            sourceId,
            type: 'apply-code',
            content,
            branchId: this.branch.id,
            branchName: this.branch.name,
        };

        const existingErrors = this._errors || [];
        const isDuplicate = existingErrors.some((e) => compareErrors(e, error));

        if (!isDuplicate) {
            this._errors = [...existingErrors, error];
        }
    }

    handleSuccess(message: string) {
        this.clear();
    }

    clear() {
        this._errors = [];
    }
}
