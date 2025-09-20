import { ChatType, type DomElement } from '@onlook/models';
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
import { assertNever, type ParsedError } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';
import { countTokensInString } from '@onlook/ai/src/tokens';

export class ChatContext {
    private _context: MessageContext[] = [];
    private selectedReactionDisposer?: () => void;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    init() {
        this.selectedReactionDisposer = reaction(
            () => this.editorEngine.elements.selected,
            () => this.generateContextFromReaction().then((context) => (this.context = context)),
        );
    }

    get context(): MessageContext[] {
        return this._context;
    }

    set context(context: MessageContext[]) {
        this._context = context;
    }

    addContexts(contexts: MessageContext[]) {
        this._context = [...this._context, ...contexts];
    }

    async getContextByChatType(type: ChatType): Promise<MessageContext[]> {
        switch (type) {
            case ChatType.EDIT:
            case ChatType.CREATE:
            case ChatType.ASK:
                return await this.getLatestContext();
            case ChatType.FIX:
                return this.getErrorContext();
            default:
                assertNever(type);
        }
    }

    async getLatestContext(): Promise<MessageContext[]> {
        return await this.getRefreshedContext(this.context);
    }

    private async generateContextFromReaction(): Promise<MessageContext[]> {
        const selected = this.editorEngine.elements.selected;

        let highlightedContext: HighlightMessageContext[] = [];
        if (selected.length) {
            highlightedContext = await this.getHighlightedContext(selected);
        }
        const imageContext = await this.getImageContext();

        // Derived from highlighted context
        const fileContext = await this.getFileContext(highlightedContext);
        const branchContext = this.getBranchContext(highlightedContext);
        const context = [...fileContext, ...highlightedContext, ...imageContext, ...branchContext];
        return context;
    }

    async getRefreshedContext(context: MessageContext[]): Promise<MessageContext[]> {
        // Refresh the context if possible. Files and highlight content may have changed since the last time they were added to the context.
        // Images are not refreshed as they are not editable.
        return await Promise.all(context.map(async (c) => {
            if (c.type === MessageContextType.FILE) {
                const fileContent = await this.editorEngine.activeSandbox.readFile(c.path);
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
            const file = await this.editorEngine.activeSandbox.readFile(filePath);
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
                    content: branch.description ?? branch.name,
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

    // TODO: Enhance with custom rules
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

    getErrorContext(): ErrorMessageContext[] {
        const branchErrors = this.editorEngine.branches.getAllErrors();
        // Group errors by branch for context
        const branchGroups = new Map<string, ParsedError[]>();
        branchErrors.forEach(error => {
            const existing = branchGroups.get(error.branchId) || [];
            existing.push(error);
            branchGroups.set(error.branchId, existing);
        });

        // Create context for each branch with errors
        return Array.from(branchGroups.entries()).map(([branchId, branchErrors]) => ({
            type: MessageContextType.ERROR,
            content: branchErrors
                .map((e) => `Source: ${e.sourceId}\nContent: ${e.content}\n`)
                .join('\n'),
            displayName: `Errors - ${branchErrors[0]?.branchName || 'Unknown Branch'}`,
            branchId,
        }));
    }

    async getCreateContext() {
        try {
            const createContext: MessageContext[] = [];
            const pageContext = await this.getDefaultPageContext();
            const styleGuideContext = await this.getDefaultStyleGuideContext();
            if (pageContext) {
                createContext.push(pageContext);
            }
            if (styleGuideContext) {
                createContext.push(...styleGuideContext);
            }
            return createContext;
        } catch (error) {
            console.error('Error getting create context', error);
            return [];
        }
    }

    async getDefaultPageContext(): Promise<FileMessageContext | null> {
        try {
            const pagePaths = ['./app/page.tsx', './src/app/page.tsx'];
            for (const pagePath of pagePaths) {
                const file = await this.editorEngine.activeSandbox.readFile(pagePath);
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

    clearImagesFromContext() {
        this.context = this.context.filter((context) => context.type !== MessageContextType.IMAGE);
    }

    getContextTokenCount(): number {
        return this.context.reduce((total, ctx) => {
            return total + countTokensInString(ctx.content || '');
        }, 0);
    }

    getContextSummary(): {
        totalContexts: number;
        totalTokens: number;
        byType: Record<string, number>;
    } {
        const summary = {
            totalContexts: this.context.length,
            totalTokens: this.getContextTokenCount(),
            byType: {} as Record<string, number>
        };

        this.context.forEach(ctx => {
            summary.byType[ctx.type] = (summary.byType[ctx.type] || 0) + 1;
        });

        return summary;
    }

    clear() {
        this.selectedReactionDisposer?.();
        this.selectedReactionDisposer = undefined;
        this.context = [];
    }
}
