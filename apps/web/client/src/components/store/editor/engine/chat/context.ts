import type { ProjectsManager } from '@/lib/projects';
import {
    MessageContextType,
    type ChatMessageContext,
    type ErrorMessageContext,
    type FileMessageContext,
    type HighlightMessageContext,
    type ImageMessageContext,
    type ProjectMessageContext,
} from '@onlook/models/chat';
import type { DomElement } from '@onlook/models/element';
import type { ParsedError } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '..';
export class ChatContext {
    context: ChatMessageContext[] = [];

    constructor(
        private editorEngine: EditorEngine,
        private projectsManager: ProjectsManager,
    ) {
        makeAutoObservable(this);
        reaction(
            () => this.editorEngine.elements.selected,
            () => this.getChatContext().then((context) => (this.context = context)),
        );
        reaction(
            () => this.projectsManager.project?.folderPath,
            (folderPath) => {
                if (folderPath) {
                    this.getChatContext().then((context) => (this.context = context));
                }
            },
        );
    }

    async getChatContext(): Promise<ChatMessageContext[]> {
        const selected = this.editorEngine.elements.selected;
        const fileNames = new Set<string>();
        let highlightedContext: HighlightMessageContext[] = [];
        if (selected.length) {
            highlightedContext = await this.getHighlightedContext(selected, fileNames);
        }
        const fileContext = await this.getFileContext(fileNames);
        const imageContext = await this.getImageContext();
        const projectContext = await this.getProjectContext();
        const context = [...fileContext, ...highlightedContext, ...imageContext, ...projectContext];
        return context;
    }

    private async getImageContext(): Promise<ImageMessageContext[]> {
        const imageContext = this.context.filter(
            (context) => context.type === MessageContextType.IMAGE,
        );
        return imageContext;
    }

    private async getFileContext(fileNames: Set<string>): Promise<FileMessageContext[]> {
        const fileContext: FileMessageContext[] = [];
        for (const fileName of fileNames) {
            const fileContent = await this.editorEngine.code.getFileContent(fileName, false);
            if (fileContent === null) {
                continue;
            }
            fileContext.push({
                type: MessageContextType.FILE,
                displayName: fileName,
                path: fileName,
                content: fileContent,
            });
        }
        return fileContext;
    }

    private async getHighlightedContext(
        selected: DomElement[],
        fileNames: Set<string>,
    ): Promise<HighlightMessageContext[]> {
        const highlightedContext: HighlightMessageContext[] = [];
        for (const node of selected) {
            const oid = node.oid;
            if (!oid) {
                continue;
            }

            const codeBlock = await this.editorEngine.code.getCodeBlock(oid, true);
            if (codeBlock === null) {
                continue;
            }

            const templateNode = await this.editorEngine.ast.getTemplateNodeById(oid);
            if (!templateNode) {
                continue;
            }

            highlightedContext.push({
                type: MessageContextType.HIGHLIGHT,
                displayName: node.tagName.toLowerCase(),
                path: templateNode.path,
                content: codeBlock,
                start: templateNode.startTag.start.line,
                end: templateNode.endTag?.end.line || templateNode.startTag.start.line,
            });
            fileNames.add(templateNode.path);
        }

        return highlightedContext;
    }

    clear() {
        this.context = [];
    }

    async addScreenshotContext() {
        const screenshot = await this.getScreenshotContext();
        if (screenshot) {
            this.context.push(screenshot);
        }
    }

    async getScreenshotContext(): Promise<ImageMessageContext | null> {
        if (this.editorEngine.elements.selected.length === 0) {
            return null;
        }
        const webviewId = this.editorEngine.elements.selected[0].frameId;
        if (!webviewId) {
            return null;
        }

        const timestamp = Date.now();
        const screenshotName = `chat-screenshot-${timestamp}`;

        try {
            const result = await this.editorEngine.takeWebviewScreenshot(screenshotName, webviewId);
            if (!result || !result.image) {
                console.error('Failed to capture screenshot');
                return null;
            }
            const { image } = result;

            return {
                type: MessageContextType.IMAGE,
                content: image,
                mimeType: 'image/png',
                displayName: 'screen',
            };
        } catch (error) {
            console.error('Failed to capture screenshot:', error);
            return null;
        }
    }

    getProjectContext(): ProjectMessageContext[] {
        const folderPath = this.projectsManager.project?.folderPath;
        if (!folderPath) {
            return [];
        }

        return [
            {
                type: MessageContextType.PROJECT,
                content: '',
                displayName: 'Project',
                path: folderPath,
            },
        ];
    }

    getMessageContext(errors: ParsedError[]): ErrorMessageContext[] {
        const content = errors
            .map((e) => `Source: ${e.sourceId}\nContent: ${e.content}\n`)
            .join('\n');

        return [
            {
                type: MessageContextType.ERROR,
                content,
                displayName: 'Error',
            },
        ];
    }

    async clearAttachments() {
        this.context = this.context.filter((context) => context.type !== MessageContextType.IMAGE);
    }

    dispose() {
        // Clear context
        this.clear();

        // Clear references
        this.editorEngine = null as any;
    }
}
