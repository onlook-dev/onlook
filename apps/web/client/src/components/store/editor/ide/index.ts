import { getLanguageFromFileName } from '@/app/project/[id]/_components/right-panel/code-tab/code-mirror-config';
import { EditorTabValue } from '@onlook/models';
import { convertToBase64 } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import type { EditorEngine } from '../engine';

export interface EditorFile {
    id: string;
    filename: string;
    path: string;
    content: string;
    language: string;
    isDirty: boolean;
    isBinary: boolean;
    savedContent: string;
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
    highlightRange: CodeRange | null = null;
    searchTerm: string = '';
    isLoading = false;
    isFilesLoading = false;
    isFilesVisible = true;
    fileModalOpen = false;
    folderModalOpen = false;
    uploadModalOpen = false;
    showUnsavedDialog = false;
    pendingCloseAll = false;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    get isSandboxReady() {
        return !!(
            this.editorEngine.activeSandbox.session.provider &&
            !this.editorEngine.activeSandbox.session.isConnecting
        );
    }

    async refreshFiles() {
        if (!this.isSandboxReady) {
            console.error('Sandbox not connected');
            return;
        }
        this.isFilesLoading = true;
        try {
            // Trigger a fresh file list from the sandbox
            await this.editorEngine.activeSandbox.listAllFiles();
        } catch (error) {
            console.error('Error loading files:', error);
        } finally {
            this.isFilesLoading = false;
        }
    }

    async openFile(filePath: string, searchTerm?: string, toggleTab: boolean = true): Promise<EditorFile | null> {
        if (toggleTab) {
            this.editorEngine.state.rightPanelTab = EditorTabValue.DEV;
        }
        if (!this.isSandboxReady) {
            console.error('Sandbox not connected');
            return null;
        }
        this.isLoading = true;
        try {
            let content = "";
            let isBinary = false;

            const foundFile = await this.editorEngine.activeSandbox.readFile(filePath);
            if (!foundFile) {
                return null;
            }

            if (foundFile.type === 'binary') {
                let binaryContent = foundFile.content;
                if (!binaryContent) {
                    return null;
                }

                const base64String = convertToBase64(binaryContent);
                content = base64String;
                isBinary = true;
            } else {
                content = foundFile.content;
            }

            const fileName = filePath.split('/').pop() || '';
            const language = getLanguageFromFileName(fileName);
            const existing = this.openedFiles.find((f) => f.path === filePath);
            if (existing) {
                this.activeFile = existing;
                if (searchTerm) {
                    this.searchTerm = searchTerm;
                }
                return existing;
            }
            const file: EditorFile = {
                id: nanoid(),
                filename: fileName,
                path: filePath,
                content: content || '',
                savedContent: content || '',
                language,
                isDirty: false,
                isBinary
            };
            this.openedFiles.push(file);
            this.activeFile = file;
            if (searchTerm) {
                this.searchTerm = searchTerm;
            }
            return file;
        } catch (error) {
            console.error('Error loading file:', error);
            return null;
        } finally {
            this.isLoading = false;
        }
    }

    async openCodeBlock(oid: string, toggleTab?: boolean) {
        try {
            const filePath = await this.getFilePathFromOid(oid);
            if (filePath) {
                await this.openFile(filePath, undefined, toggleTab);
            }
        } catch (error) {
            console.error('Error viewing source:', error);
        }
    }

    updateFileContent(id: string, content: string) {
        const file = this.openedFiles.find((f) => f.id === id);
        if (!file) return;
        const hasChanged = content !== file.savedContent;
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
        if (!this.isSandboxReady) {
            console.error('Sandbox not connected');
            return;
        }
        this.isLoading = true;
        try {
            const originalFile = await this.editorEngine.activeSandbox.readFile(
                this.activeFile.path,
            );
            if (!originalFile || originalFile.type === 'binary') {
                console.error('Error reading file');
                return;
            }
            this.editorEngine.action.run({
                type: 'write-code',
                diffs: [
                    {
                        path: this.activeFile.path,
                        original: originalFile.content || '',
                        generated: this.activeFile.content,
                    },
                ],
            });
            const file = this.openedFiles.find((f) => f.id === this.activeFile!.id);
            if (file) {
                file.isDirty = false;
                file.savedContent = file.content;
            }
            this.activeFile = { ...this.activeFile, isDirty: false, savedContent: file?.content || '' };
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
        if (!this.isSandboxReady) {
            console.error('Sandbox not connected');
            return;
        }
        const index = this.openedFiles.findIndex((f) => f.path === path);
        if (index === -1) {
            console.error('File not found');
            return;
        }
        const foundFile = await this.editorEngine.activeSandbox.readFile(path);
        if (!foundFile || foundFile.type === 'binary') {
            console.error('Content is null');
            return;
        }
        const file = this.openedFiles[index];
        if (!file) {
            console.error('File not found');
            return;
        }
        const updated: EditorFile = { ...file, content: foundFile.content };
        this.openedFiles.splice(index, 1, updated);
        if (this.activeFile && this.activeFile.id === file.id) {
            this.activeFile = updated;
        }
    }

    async getFilePathFromOid(oid: string): Promise<string | null> {
        if (!this.isSandboxReady) {
            console.error('Sandbox not connected');
            return null;
        }
        try {
            const templateNode = this.editorEngine.templateNodes.getTemplateNode(oid);
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
        if (!this.isSandboxReady) {
            console.error('Sandbox not connected');
            return null;
        }
        try {
            const templateNode = this.editorEngine.templateNodes.getTemplateNode(element.oid);
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
            const originalFile = await this.editorEngine.activeSandbox.readFile(path);
            if (!originalFile || originalFile.type === 'binary') {
                console.error('Error reading file');
                return;
            }
            const file = this.openedFiles.find((f) => f.id === id);
            if (file) file.isDirty = false;
            this.activeFile = {
                ...this.activeFile,
                isDirty: false,
                content: originalFile.content || '',
            };
        } catch (error) {
            console.error('Error discarding file:', error);
        }
    }

    setHighlightRange(range: CodeRange | null) {
        this.highlightRange = range;
        if (this.activeFile) {
            this.activeFile = { ...this.activeFile };
        }
    }

    setSearchTerm(term: string) {
        this.searchTerm = term;
        if (this.activeFile) {
            this.activeFile = { ...this.activeFile };
        }
    }

    clearSearch() {
        this.searchTerm = '';
        if (this.activeFile) {
            this.activeFile = { ...this.activeFile };
        }
    }

    clear() {
        this.openedFiles = [];
        this.activeFile = null;
        this.highlightRange = null;
        this.searchTerm = '';
        this.isLoading = false;
        this.isFilesLoading = false;
    }
}
