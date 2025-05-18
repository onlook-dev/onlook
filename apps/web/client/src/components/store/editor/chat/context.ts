import type { ProjectManager } from '@/components/store/project/manager';
import type { DomElement } from '@onlook/models';
import {
    MessageContextType,
    type ChatMessageContext,
    type ErrorMessageContext,
    type FileMessageContext,
    type HighlightMessageContext,
    type ImageMessageContext,
    type ProjectMessageContext,
} from '@onlook/models/chat';
import type { ParsedError } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';

export class ChatContext {
    context: ChatMessageContext[] = this.getProjectContext();

    constructor(
        private editorEngine: EditorEngine,
        private projectManager: ProjectManager,
    ) {
        makeAutoObservable(this);
        reaction(
            () => this.editorEngine.elements.selected,
            () => this.getChatContext().then((context) => (this.context = context)),
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
            const fileContent = await this.editorEngine.sandbox.readFile(fileName);
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
                console.error('No oid found for node', node);
                continue;
            }

            const codeBlock = await this.editorEngine.sandbox.getCodeBlock(oid);
            if (codeBlock === null) {
                console.error('No code block found for node', node);
                continue;
            }

            const templateNode = await this.editorEngine.sandbox.getTemplateNode(oid);
            if (!templateNode) {
                console.error('No template node found for node', node);
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

    getProjectContext(): ProjectMessageContext[] {
        return [
            {
                type: MessageContextType.PROJECT,
                content: '',
                displayName: 'Project',
                path: './',
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
}
