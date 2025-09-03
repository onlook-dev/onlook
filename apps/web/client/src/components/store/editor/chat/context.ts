import type { Branch, DomElement } from '@onlook/models';
import {
    MessageContextType,
    type BranchMessageContext,
    type ErrorMessageContext,
    type FileMessageContext,
    type HighlightMessageContext,
    type ImageMessageContext,
    type MessageContext,
    type ProjectMessageContext,
} from '@onlook/models/chat';
import type { ParsedError } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';

export class ChatContext {
    context: MessageContext[] = this.getProjectContext();
    private selectedReactionDisposer?: () => void;

    constructor(
        private editorEngine: EditorEngine,
    ) {
        makeAutoObservable(this);
    }

    init() {
        this.selectedReactionDisposer = reaction(
            () => this.editorEngine.elements.selected,
            () => this.getChatContext().then((context) => (this.context = context)),
        );
    }

    async getChatContext(): Promise<MessageContext[]> {
        const selected = this.editorEngine.elements.selected;

        let highlightedContext: HighlightMessageContext[] = [];
        if (selected.length) {
            highlightedContext = await this.getHighlightedContext(selected);
        }
        const imageContext = await this.getImageContext();
        const projectContext = this.getProjectContext();

        // Derived from highlighted context
        const fileContext = await this.getFileContext(highlightedContext);
        const branchContext = this.getBranchContext(highlightedContext);
        const context = [...fileContext, ...highlightedContext, ...imageContext, ...projectContext, ...branchContext];
        return context;
    }

    async getRefreshedContext(context: MessageContext[]): Promise<MessageContext[]> {
        return await Promise.all(context.map(async (c) => {
            if (c.type === MessageContextType.FILE) {
                const fileContent = await this.editorEngine.sandbox.readFile(c.path);
                if (fileContent === null) {
                    console.error('No file content found for file', c.path);
                    return c;
                }
                if (fileContent.type === 'binary') {
                    console.error('File is binary', c.path);
                    return c;
                }
                return { ...c, content: fileContent.content } satisfies FileMessageContext;
            } else if (c.type === MessageContextType.HIGHLIGHT && c.oid) {
                const codeBlock = await this.editorEngine.templateNodes.getCodeBlock(c.oid);
                if (codeBlock === null) {
                    console.error('No code block found for node', c.path);
                    return c;
                }
                return { ...c, content: codeBlock } satisfies HighlightMessageContext;
            }
            return c;
        })) satisfies MessageContext[];
    }

    private async getImageContext(): Promise<ImageMessageContext[]> {
        const imageContext = this.context.filter(
            (context) => context.type === MessageContextType.IMAGE,
        );
        return imageContext;
    }

    private async getFileContext(highlightedContext: HighlightMessageContext[]): Promise<FileMessageContext[]> {
        const fileContext: FileMessageContext[] = [];

        // Create a map of file path to branch ID from highlighted context
        const filePathToBranch = new Map<string, string>();
        highlightedContext.forEach(highlight => {
            filePathToBranch.set(highlight.path, highlight.branchId);
        });

        for (const [filePath, branchId] of filePathToBranch) {
            const file = await this.editorEngine.sandbox.readFile(filePath);
            if (file === null || file.type === 'binary') {
                continue;
            }
            fileContext.push({
                type: MessageContextType.FILE,
                displayName: filePath,
                path: filePath,
                content: file.content,
                branchId: branchId,
            });
        }
        return fileContext;
    }

    getBranchContext(highlightedContext: HighlightMessageContext[]): BranchMessageContext[] {
        // Get unique branch IDs from highlighted context
        const uniqueBranchIds = new Set<string>();
        highlightedContext.forEach(highlight => {
            uniqueBranchIds.add(highlight.branchId);
        });

        // Get branch objects for each unique branch ID
        const branchContext: BranchMessageContext[] = [];
        uniqueBranchIds.forEach(branchId => {
            const branch = this.editorEngine.branches.getBranchById(branchId);
            if (branch) {
                branchContext.push({
                    type: MessageContextType.BRANCH,
                    branch,
                    content: branch.description || '',
                    displayName: branch.name,
                } satisfies BranchMessageContext);
            }
        });

        return branchContext;
    }

    private async getHighlightedContext(
        selected: DomElement[],
    ): Promise<HighlightMessageContext[]> {
        const highlightedContext: HighlightMessageContext[] = [];
        for (const node of selected) {
            const oid = node.oid;
            if (!oid) {
                console.error('No oid found for node', node);
                continue;
            }

            const codeBlock = await this.editorEngine.templateNodes.getCodeBlock(oid);
            if (codeBlock === null) {
                console.error('No code block found for node', node);
                continue;
            }

            const templateNode = this.editorEngine.templateNodes.getTemplateNode(oid);
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
                oid,
                branchId: templateNode.branchId,
            });
        }

        return highlightedContext;
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

    getErrorContext(errors: ParsedError[]): ErrorMessageContext[] {
        const content = errors
            .map((e) => `Source: ${e.sourceId}\nContent: ${e.content}\n`)
            .join('\n');

        const activeBranchId = this.editorEngine.branches.activeBranch?.id;
        if (!activeBranchId) {
            console.error('No active branch found for error context');
            return [];
        }

        return [
            {
                type: MessageContextType.ERROR,
                content,
                displayName: 'Error',
                branchId: activeBranchId,
            },
        ];
    }

    async getCreateContext() {
        try {
            const context: MessageContext[] = [];
            const pageContext = await this.getDefaultPageContext();
            const styleGuideContext = await this.getDefaultStyleGuideContext();
            if (pageContext) {
                context.push(pageContext);
            }
            if (styleGuideContext) {
                context.push(...styleGuideContext);
            }
            return context;
        } catch (error) {
            console.error('Error getting create context', error);
            return [];
        }
    }

    async getDefaultPageContext(): Promise<FileMessageContext | null> {
        try {
            const pagePaths = ['./app/page.tsx', './src/app/page.tsx'];
            for (const pagePath of pagePaths) {
                const file = await this.editorEngine.sandbox.readFile(pagePath);
                if (file && file.type === 'text') {
                    const activeBranchId = this.editorEngine.branches.activeBranch?.id;
                    if (!activeBranchId) {
                        console.error('No active branch found for default page context');
                        continue;
                    }
                    const defaultPageContext: FileMessageContext = {
                        type: MessageContextType.FILE,
                        path: pagePath,
                        content: file.content,
                        displayName: pagePath.split('/').pop() || 'page.tsx',
                        branchId: activeBranchId,
                    }
                    return defaultPageContext
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting default page context', error);
            return null;
        }
    }

    async getDefaultStyleGuideContext(): Promise<FileMessageContext[] | null> {
        try {
            const activeBranchId = this.editorEngine.branches.activeBranch?.id;
            if (!activeBranchId) {
                console.error('No active branch found for style guide context');
                return null;
            }

            const styleGuide = await this.editorEngine.theme.initializeTailwindColorContent();
            if (!styleGuide) {
                throw new Error('No style guide found');
            }
            const tailwindConfigContext: FileMessageContext = {
                type: MessageContextType.FILE,
                path: styleGuide.configPath,
                content: styleGuide.configContent,
                displayName: styleGuide.configPath.split('/').pop() || 'tailwind.config.ts',
                branchId: activeBranchId,
            }

            const cssContext: FileMessageContext = {
                type: MessageContextType.FILE,
                path: styleGuide.cssPath,
                content: styleGuide.cssContent,
                displayName: styleGuide.cssPath.split('/').pop() || 'globals.css',
                branchId: activeBranchId,
            }

            return [tailwindConfigContext, cssContext];
        } catch (error) {
            console.error('Error getting default style guide context', error);
            return null;
        }
    }

    clearAttachments() {
        this.context = this.context.filter((context) => context.type !== MessageContextType.IMAGE);
    }

    clear() {
        this.selectedReactionDisposer?.();
        this.selectedReactionDisposer = undefined;
        this.context = [];
    }
}
