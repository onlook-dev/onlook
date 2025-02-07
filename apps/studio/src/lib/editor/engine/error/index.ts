import type { ProjectsManager } from '@/lib/projects';
import type { FileMessageContext, HighlightMessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { type ParsedError, compareErrors, parseReactError } from '@onlook/utility';
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
        return Array.from(Object.values(this.webviewIdToError));
    }

    get validError() {
        return this.errors.flat().find((e) => e.type !== 'UNKNOWN' && e.filePath !== undefined);
    }

    get validErrors() {
        return this.errors.flat().filter((e) => e.type !== 'UNKNOWN' && e.filePath !== undefined);
    }

    async sendFixError() {
        if (this.validErrors.length > 0) {
            const res = await this.editorEngine.chat.sendFixErrorToAi(this.validErrors);
            if (res) {
                this.removeErrorsFromMap(this.validErrors);
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

    openErrorFile() {
        if (this.validError?.filePath) {
            this.editorEngine.code.viewSourceFile(this.validError.filePath);
        }
    }

    errorByWebviewId(webviewId: string) {
        return this.webviewIdToError[webviewId];
    }

    addError(webviewId: string, event: Electron.ConsoleMessageEvent) {
        if (event.sourceId?.includes('localhost')) {
            return;
        }
        const error = parseReactError(event.message, event.sourceId);
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
        error: ParsedError[],
    ): Promise<(FileMessageContext | HighlightMessageContext)[] | null> {
        const contexts: (FileMessageContext | HighlightMessageContext)[] = [];
        const processedFilePaths = new Set<string>();

        for (const err of error) {
            const filePath = err.filePath;
            if (!filePath) {
                console.error('No file path found for error:', err);
                continue;
            }

            // Only fetch file content and create FileMessageContext if we haven't seen this file
            if (!processedFilePaths.has(filePath)) {
                const content = await this.editorEngine.code.getFileContent(filePath, true);
                if (!content) {
                    console.error('No content found for file:', filePath);
                    continue;
                }

                contexts.push({
                    content,
                    path: filePath,
                    type: MessageContextType.FILE,
                    displayName: filePath,
                });
                processedFilePaths.add(filePath);
            }

            // Add highlight context if line number exists
            if (err.line) {
                contexts.push({
                    content: err.message,
                    path: filePath,
                    type: MessageContextType.HIGHLIGHT,
                    displayName: 'error',
                    start: err.line,
                    end: err.line + 1,
                });
            }
        }

        return contexts.length > 0 ? contexts : null;
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

    clearErrors(webviewId: string) {
        delete this.webviewIdToError[webviewId];
    }

    clear() {
        this.webviewIdToError = {};
    }
}
