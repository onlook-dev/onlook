import {
    MessageContextType,
    type ChatMessageContext,
    type FileMessageContext,
    type HighlightedMessageContext,
} from '@onlook/models/chat';
import type { DomElement } from '@onlook/models/element';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '..';

export class ChatContext {
    displayContext: ChatMessageContext[] = [];
    context: ChatMessageContext[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
        reaction(
            () => this.editorEngine.elements.selected,
            (selected) => this.updateDisplayContext(selected),
        );
    }

    async getChatContext() {
        const selected = this.editorEngine.elements.selected;
        if (selected.length === 0) {
            return [];
        }

        const fileNames = new Set<string>();

        const highlightedContext: HighlightedMessageContext[] = [];
        for (const node of selected) {
            const oid = node.instanceId || node.oid;
            if (!oid) {
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
                content: '',
                start: templateNode.startTag.start.line,
                end: templateNode.endTag?.end.line || templateNode.startTag.start.line,
            });
            fileNames.add(templateNode.path);
        }

        const fileContext: FileMessageContext[] = [];
        for (const fileName of fileNames) {
            fileContext.push({
                type: MessageContextType.FILE,
                displayName: fileName,
                path: fileName,
                content: '',
            });
        }
        return [...fileContext, ...highlightedContext];
    }

    async updateDisplayContext(selected: DomElement[]) {
        if (selected.length === 0) {
            this.displayContext = [];
            return;
        }

        const fileNames = new Set<string>();

        const highlightedContext: HighlightedMessageContext[] = [];
        for (const node of selected) {
            const oid = node.oid;
            if (!oid) {
                continue;
            }
            const codeBlock = await this.editorEngine.code.getCodeBlock(oid);
            if (!codeBlock) {
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

        const fileContext: FileMessageContext[] = [];
        for (const fileName of fileNames) {
            const fileContent = await this.editorEngine.code.getFileContent(fileName);
            if (!fileContent) {
                continue;
            }
            fileContext.push({
                type: MessageContextType.FILE,
                displayName: fileName,
                path: fileName,
                content: fileContent,
            });
        }
        this.displayContext = [...fileContext, ...highlightedContext];
    }
    clear() {
        this.context = [];
    }
}
