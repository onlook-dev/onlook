import type { FileMessageContext, HighlightMessageContext } from '@onlook/models/chat';
import { MessageContextType } from '@onlook/models/chat';
import { type ParsedError, compareErrors } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '..';

export class ErrorManager {
    private webviewIdToError: Record<string, ParsedError[]> = {};

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this, {});
    }

    get errors() {
        return Array.from(Object.values(this.webviewIdToError));
    }

    errorByWebviewId(webviewId: string) {
        return this.webviewIdToError[webviewId];
    }

    addError(webviewId: string, error: ParsedError) {
        const existingErrors = this.webviewIdToError[webviewId] || [];
        if (!existingErrors.some((e) => compareErrors(e, error))) {
            this.webviewIdToError[webviewId] = [...existingErrors, error];
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
            displayName: filePath,
            start: error.line,
            end: error.line + 1,
        };
        return [fileContext, highlightContext];
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
