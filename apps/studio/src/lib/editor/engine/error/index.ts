import type { ProjectsManager } from '@/lib/projects';
import type { ErrorMessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { type ParsedError, compareErrors } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class ErrorManager {
    private terminalErrors: ParsedError[] = [];
    shouldShowErrors: boolean = false;

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this, {});
    }

    get errors(): ParsedError[] {
        return this.terminalErrors;
    }

    async sendFixError() {
        if (this.errors.length > 0) {
            const res = await this.editorEngine.chat.sendFixErrorToAi(this.errors);
            if (res) {
                this.terminalErrors = [];
            }
        }
    }

    removeTerminalErrors(errors: ParsedError[]) {
        this.terminalErrors = this.terminalErrors.filter(
            (existing) => !errors.some((error) => compareErrors(existing, error)),
        );
    }

    addTerminalError(error: string) {
        if (this.terminalErrors.some((e) => e.content === error)) {
            return;
        }
        const parsedError: ParsedError = {
            sourceId: 'Terminal',
            content: error,
        };
        this.terminalErrors.push(parsedError);
        this.shouldShowErrors = true;
    }

    getMessageContext(errors: ParsedError[]): ErrorMessageContext {
        const content = errors.map((e) => e.content).join('\n');
        return {
            type: MessageContextType.ERROR,
            content,
            displayName: 'Error',
        };
    }

    clear() {
        this.terminalErrors = [];
    }
}
