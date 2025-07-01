import { getLanguageFromFileName } from '@/app/project/[id]/_components/right-panel/dev-tab/code-mirror-config';
import { BINARY_EXTENSIONS } from '@onlook/constants';
import { EditorTabValue, type DomElement } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';
import path from 'path';
import type { ActionManager } from '../action';
import type { ElementsManager } from '../element';
import type { FramesManager } from '../frames';
import type { SandboxManager } from '../sandbox';
import type { StateManager } from '../state';

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
    files: string[] = [];
    highlightRange: CodeRange | null = null;
    isLoading = false;
    isFilesLoading = false;

    constructor(
        private readonly sandboxManager: SandboxManager,
        private readonly actionManager: ActionManager,
        private readonly framesManager: FramesManager,
        private readonly stateManager: StateManager,
        private readonly elementsManager: ElementsManager,
    ) {
        makeAutoObservable(this);
    }

    private isSandboxReady() {
        return !!(
            this.sandboxManager.session.session &&
            !this.sandboxManager.session.isConnecting
        );
    }

    async viewCodeBlock(oid: string) {
        try {
            this.stateManager.rightPanelTab = EditorTabValue.DEV;
            const element =
                this.elementsManager.selected.find((el: DomElement) => el.oid === oid) ||
                this.elementsManager.selected.find((el: DomElement) => el.instanceId === oid);

            if (element) {
                const templateNode = await this.sandboxManager.getTemplateNode(element.oid || '');
                if (templateNode) {
                    await this.openFile(templateNode.path);
                    // Then select the element after a small delay to ensure the file is loaded
                    setTimeout(() => {
                        this.elementsManager.selected = [element];
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Error viewing source:', error);
        }
    }

    async viewSourceFile(filePath: string) {
        await this.openFile(filePath);
    }

    async refreshFiles() {
        if (!this.isSandboxReady()) {
            console.error('Sandbox not connected');
            return;
        }
        this.isFilesLoading = true;
        try {
            this.files = await this.sandboxManager.listAllFiles();
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
                const binaryContent = await this.sandboxManager.readBinaryFile(filePath);
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
                const readFileContent = await this.sandboxManager.readFile(filePath);
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
                savedContent: content || '',
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
        if (!this.isSandboxReady()) {
            console.error('Sandbox not connected');
            return;
        }
        this.isLoading = true;
        try {
            const originalContent = await this.sandboxManager.readFile(
                this.activeFile.path,
            );
            this.actionManager.run({
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
            if (file) {
                file.isDirty = false;
                file.savedContent = file.content;
            }
            this.activeFile = { ...this.activeFile, isDirty: false, savedContent: file?.content || '' };

            this.refreshPreviewAfterSave();
        } catch (error) {
            console.error('Error saving file:', error);
        } finally {
            this.isLoading = false;
        }
    }

    private refreshPreviewAfterSave() {
        if (!this.activeFile) {
            return;
        }

        if (this.shouldRefreshPreview(this.activeFile.path)) {
            setTimeout(() => {
                this.framesManager.reloadAll();
            }, 100);
        }
    }

    private shouldRefreshPreview(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        const affectsPreview = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.sass', '.less', '.html'];
        return affectsPreview.includes(ext);
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
        const content = await this.sandboxManager.readFile(path);
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
            const templateNode = await this.sandboxManager.getTemplateNode(element.oid);
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
            const originalContent = await this.sandboxManager.readFile(path);
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
        if (this.activeFile) {
            this.activeFile = { ...this.activeFile };
        }
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
