import type { ProjectsManager } from '@/lib/projects';
import type { FileMessageContext, HighlightMessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { type ParsedError, compareErrors, parseReactError } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class ErrorManager {
    private webviewIdToError: Record<string, ParsedError[]> = {};

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this, {});
    }

    get errors() {
        return Array.from(Object.values(this.webviewIdToError));
    }

    get validError() {
        return this.errors.flat().find((e) => e.type !== 'UNKNOWN' && e.filePath !== undefined);
    }

    get validErrors() {
        return this.errors.flat().filter((e) => e.type !== 'UNKNOWN' && e.filePath !== undefined);
    }

    async sendFixError() {
        if (this.validError) {
            const res = await this.editorEngine.chat.sendFixErrorToAi(this.validError);
            if (res) {
                this.removeErrorFromMap(this.validError);
            }
        }
    }

    removeErrorFromMap(error: ParsedError) {
        for (const [webviewId, errors] of Object.entries(this.webviewIdToError)) {
            this.webviewIdToError[webviewId] = errors.filter((e) => !compareErrors(e, error));
        }
    }

    openErrorFile() {
        if (this.validError?.filePath) {
            this.editorEngine.code.viewSourceFile(this.validError.filePath);
        }
    }

    errorByWebviewId(webviewId: string) {
        return this.webviewIdToError[webviewId];
    }

    addError(webviewId: string, event: Electron.ConsoleMessageEvent) {
        const error = parseReactError(event.message, event.sourceId);
        console.log(error);
        const existingErrors = this.webviewIdToError[webviewId] || [];
        if (!existingErrors.some((e) => compareErrors(e, error))) {
            this.webviewIdToError[webviewId] = [
                ...existingErrors,
                {
                    ...error,
                    filePath: this.getUseableFilePath(error.filePath || ''),
                },
            ];
        }
    }

    async getMessageContextFromError(
        error: ParsedError,
    ): Promise<(FileMessageContext | HighlightMessageContext)[] | null> {
        const filePath = error.filePath;
        if (!filePath) {
            console.error('No file path found');
            return null;
        }

        const content = await this.editorEngine.code.getFileContent(filePath, true);
        if (!content) {
            console.error('No content found');
            return null;
        }

        const fileContext: FileMessageContext = {
            content,
            path: filePath,
            type: MessageContextType.FILE,
            displayName: filePath,
        };

        if (!error.line) {
            return [fileContext];
        }

        const highlightContext: HighlightMessageContext = {
            content: error.message,
            path: filePath,
            type: MessageContextType.HIGHLIGHT,
            displayName: 'error',
            start: error.line,
            end: error.line + 1,
        };
        return [fileContext, highlightContext];
    }

    getUseableFilePath(filePath: string) {
        filePath = filePath.replace(/\\/g, '/'); // Convert Windows backslashes to forward slashes
        if (!filePath.startsWith('/')) {
            filePath = [this.projectsManager.project?.folderPath, filePath]
                .filter(Boolean)
                .join('/');
        }
        return filePath;
    }

    getContentFromFile(content: string, row: number, column: number) {
        const lines = content.split('\n');
        const line = lines[row - 1];
        const start = column - 1;
        return {
            content: line.slice(start),
            start,
            end: line.length,
        };
    }

    removeWebview(webviewId: string) {
        delete this.webviewIdToError[webviewId];
    }

    clear() {
        this.webviewIdToError = {};
    }
}
