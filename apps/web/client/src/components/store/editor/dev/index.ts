import { getLanguageFromFileName } from '@/app/project/[id]/_components/right-panel/dev-tab/code-mirror-config';
import { BINARY_EXTENSIONS } from '@onlook/constants';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import path from 'path';
import type { EditorEngine } from '../engine';

export interface EditorFile {
    id: string;
    filename: string;
    path: string;
    content: string;
    language: string;
    isDirty: boolean;
    isBinary: boolean;
}

export interface CodeRange {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
}

export class IDEManager {
    openedFiles: EditorFile[] = [];
    activeFile: EditorFile | null = null;
    files: string[] = [];
    highlightRange: CodeRange | null = null;
    isLoading = false;
    isFilesLoading = false;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    private isSandboxReady() {
        return !!(
            this.editorEngine.sandbox.session.session &&
            !this.editorEngine.sandbox.session.isConnecting
        );
    }

    async refreshFiles() {
        if (!this.isSandboxReady()) {
            console.error('Sandbox not connected');
            return;
        }
        this.isFilesLoading = true;
        try {
            this.files = await this.editorEngine.sandbox.listAllFiles();
        } catch (error) {
            console.error('Error loading files:', error);
        } finally {
            this.isFilesLoading = false;
        }
    }

    async openFile(filePath: string): Promise<EditorFile | null> {
        if (!this.isSandboxReady()) {
            console.error('Sandbox not connected');
            return null;
        }
        this.isLoading = true;
        try {

            const ext = path.extname(filePath).toLocaleLowerCase();
            let content = "";
            let isBinary = false;

            if (BINARY_EXTENSIONS.includes(ext)) {
                const binaryContent = await this.editorEngine.sandbox.readBinaryFile(filePath);
                if (binaryContent) {
                    const base64String = btoa(
                        Array.from(binaryContent)
                            .map((byte: number) => String.fromCharCode(byte))
                            .join(''),
                    );
                    content = base64String;
                    isBinary = true;
                }
            } else {
                const readFileContent = await this.editorEngine.sandbox.readFile(filePath);
                if (readFileContent) {
                    content = readFileContent;
                }
            }

            const fileName = filePath.split('/').pop() || '';
            const language = getLanguageFromFileName(fileName);
            const existing = this.openedFiles.find((f) => f.path === filePath);
            if (existing) {
                this.activeFile = existing;
                return existing;
            }
            const file: EditorFile = {
                id: nanoid(),
                filename: fileName,
                path: filePath,
                content: content || '',
                language,
                isDirty: false,
                isBinary
            };
            this.openedFiles.push(file);
            this.activeFile = file;
            return file;
        } catch (error) {
            console.error('Error loading file:', error);
            return null;
        } finally {
            this.isLoading = false;
        }
    }

    updateFileContent(id: string, content: string) {
        const file = this.openedFiles.find((f) => f.id === id);
        if (!file) return;
        const hasChanged = content !== file.content;
        file.content = content;
        file.isDirty = hasChanged;
        if (this.activeFile && this.activeFile.id === id) {
            this.activeFile = { ...file };
        }
    }

    async saveActiveFile() {
        if (!this.activeFile) {
            console.error('No active file');
            return;
        }
        if (!this.isSandboxReady()) {
            console.error('Sandbox not connected');
            return;
        }
        this.isLoading = true;
        try {
            const originalContent = await this.editorEngine.sandbox.readFile(
                this.activeFile.path,
            );
            this.editorEngine.action.run({
                type: 'write-code',
                diffs: [
                    {
                        path: this.activeFile.path,
                        original: originalContent || '',
                        generated: this.activeFile.content,
                    },
                ],
            });
            const file = this.openedFiles.find((f) => f.id === this.activeFile!.id);
            if (file) file.isDirty = false;
            this.activeFile = { ...this.activeFile, isDirty: false };
        } catch (error) {
            console.error('Error saving file:', error);
        } finally {
            this.isLoading = false;
        }
    }

    closeFile(id: string) {
        const index = this.openedFiles.findIndex((f) => f.id === id);
        if (index === -1) return;
        this.openedFiles.splice(index, 1);
        if (this.activeFile?.id === id) {
            this.activeFile = this.openedFiles[index] || this.openedFiles[index - 1] || null;
        }
        this.highlightRange = null;
    }

    closeAllFiles() {
        this.openedFiles = [];
        this.activeFile = null;
        this.highlightRange = null;
    }

    async loadNewContent(path: string) {
        if (!this.isSandboxReady()) {
            console.error('Sandbox not connected');
            return;
        }
        const index = this.openedFiles.findIndex((f) => f.path === path);
        if (index === -1) {
            console.error('File not found');
            return;
        }
        const content = await this.editorEngine.sandbox.readFile(path);
        if (content == null) {
            console.error('Content is null');
            return;
        }
        const file = this.openedFiles[index];
        if (!file) {
            console.error('File not found');
            return;
        }
        const updated: EditorFile = { ...file, content };
        this.openedFiles.splice(index, 1, updated);
        if (this.activeFile && this.activeFile.id === file.id) {
            this.activeFile = updated;
        }
    }

    async getFilePathFromOid(oid: string): Promise<string | null> {
        if (!this.isSandboxReady()) {
            console.error('Sandbox not connected');
            return null;
        }
        try {
            const templateNode = await this.editorEngine.sandbox.getTemplateNode(oid);
            if (templateNode?.path) {
                return templateNode.path;
            }
        } catch (error) {
            console.error('Error getting file path from OID:', error);
        }
        return null;
    }

    async getElementCodeRange(element: any): Promise<CodeRange | null> {
        if (!this.activeFile || !element.oid) {
            console.error('No active file or OID');
            return null;
        }
        if (!this.isSandboxReady()) {
            console.error('Sandbox not connected');
            return null;
        }
        try {
            const templateNode = await this.editorEngine.sandbox.getTemplateNode(element.oid);
            if (templateNode?.startTag) {
                return {
                    startLineNumber: templateNode.startTag.start.line,
                    startColumn: templateNode.startTag.start.column,
                    endLineNumber: templateNode.endTag?.end.line || templateNode.startTag.end.line,
                    endColumn: templateNode.endTag?.end.column || templateNode.startTag.end.column,
                };
            }
        } catch (error) {
            console.error('Error getting element code range:', error);
        }
        return null;
    }

    async discardFileChanges(id: string) {
        if (!this.activeFile) {
            console.error('No active file');
            return;
        }
        try {
            const path = (this.openedFiles.find((f) => f.id === id))?.path;
            if (!path) {
                console.error('No path found');
                return;
            }
            const originalContent = await this.editorEngine.sandbox.readFile(path);
            const file = this.openedFiles.find((f) => f.id === id);
            if (file) file.isDirty = false;
            this.activeFile = {
                ...this.activeFile,
                isDirty: false,
                content: originalContent || '',
            };
        } catch (error) {
            console.error('Error discarding file:', error);
        }
    }

    setHighlightRange(range: CodeRange | null) {
        this.highlightRange = range;
    }

    clear() {
        this.openedFiles = [];
        this.activeFile = null;
        this.files = [];
        this.highlightRange = null;
        this.isLoading = false;
        this.isFilesLoading = false;
    }
}
