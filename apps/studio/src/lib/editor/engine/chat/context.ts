import {
    MessageContextType,
    type ChatMessageContext,
    type FileMessageContext,
    type HighlightMessageContext,
} from '@onlook/models/chat';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '..';

export class ChatContext {
    context: ChatMessageContext[] = [];

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
        reaction(
            () => this.editorEngine.elements.selected,
            () => this.getChatContext(true).then((context) => (this.context = context)),
        );
    }

    async getChatContext(skipContent: boolean = false) {
        const selected = this.editorEngine.elements.selected;
        if (selected.length === 0) {
            return [];
        }

        const fileNames = new Set<string>();

        const highlightedContext: HighlightMessageContext[] = [];
        for (const node of selected) {
            const oid = node.oid;
            if (!oid) {
                continue;
            }

            let codeBlock: string | null;

            // Skip content for display context
            if (skipContent) {
                codeBlock = '';
            } else {
                codeBlock = await this.editorEngine.code.getCodeBlock(oid);
            }

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

        const fileContext: FileMessageContext[] = [];
        for (const fileName of fileNames) {
            let fileContent: string | null;

            // Skip content for display context
            if (skipContent) {
                fileContent = '';
            } else {
                fileContent = await this.editorEngine.code.getFileContent(fileName, true);
            }
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

        return [...fileContext, ...highlightedContext];
    }

    clear() {
        this.context = [];
    }
}
