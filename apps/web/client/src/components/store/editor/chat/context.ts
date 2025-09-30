import { makeAutoObservable, reaction } from 'mobx';

import  { type DomElement } from '@onlook/models';
import  {
    type BranchMessageContext,
    type ErrorMessageContext,
    type FileMessageContext,
    type HighlightMessageContext,
    type ImageMessageContext,
    type MessageContext,
    type ProjectMessageContext,
} from '@onlook/models/chat';
import  { type ParsedError } from '@onlook/utility';
import { ChatType } from '@onlook/models';
import { MessageContextType } from '@onlook/models/chat';
import { assertNever } from '@onlook/utility';

import { type EditorEngine } from '../engine';
import { type FrameData } from '../frames';

export class ChatContext {
    private _context: MessageContext[] = [];
    private selectedReactionDisposer?: () => void;

    constructor(private editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    init() {
        this.selectedReactionDisposer = reaction(
            () => ({
                elements: this.editorEngine.elements.selected,
                frames: this.editorEngine.frames.selected,
            }),
            (
                { elements, frames },
            ) => this.generateContextFromReaction({ elements, frames }).then((context) => (this.context = context)),
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

    private async generateContextFromReaction({ elements, frames }: { elements: DomElement[], frames: FrameData[] }): Promise<MessageContext[]> {
        let highlightedContext: HighlightMessageContext[] = [];
        if (elements.length) {
            highlightedContext = await this.getHighlightedContext(elements);
        }
        const imageContext = await this.getImageContext();

        // Derived from highlighted context
        const fileContext = await this.getFileContext(highlightedContext);
        const branchContext = this.getBranchContext(highlightedContext, frames);
        const context = [...fileContext, ...highlightedContext, ...imageContext, ...branchContext];
        return context;
    }

    async getRefreshedContext(context: MessageContext[]): Promise<MessageContext[]> {
        // Refresh the context if possible. Files and highlight content may have changed since the last time they were added to the context.
        // Images are not refreshed as they are not editable.
        return (await Promise.all(
            context.map(async (c) => {
                if (c.type === MessageContextType.FILE) {
                    const fileContent = await this.editorEngine.codeEditor.readFile(c.path);
                    if (fileContent === null || fileContent instanceof Uint8Array) {
                        console.error('No file content found or file is binary', c.path);
                        return c;
                    }
                    return { ...c, content: fileContent } satisfies FileMessageContext;
                } else if (c.type === MessageContextType.HIGHLIGHT && c.oid) {
                    const metadata = await this.editorEngine.codeEditor.getJsxElementMetadata(
                        c.oid,
                    );
                    if (!metadata?.code) {
                        console.error('No code block found for node', c.path);
                        return c;
                    }
                    return { ...c, content: metadata.code } satisfies HighlightMessageContext;
                }
                return c;
            }),
        )) satisfies MessageContext[];
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
            const content = await this.editorEngine.codeEditor.readFile(filePath);
            if (content === null || content instanceof Uint8Array) {
                continue;
            }
            fileContext.push({
                type: MessageContextType.FILE,
                displayName: filePath,
                path: filePath,
                content,
                branchId: branchId,
            });
        }
        return fileContext;
    }

    getBranchContext(
        highlightedContext: HighlightMessageContext[],
        frames: FrameData[],
    ): BranchMessageContext[] {
        // Get unique branch IDs from selected elements and frames context
        const uniqueBranchIds = new Set<string>(frames.map(frame => frame.frame.branchId));

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
            const instanceId = node.instanceId;

            if (oid) {
                const context = await this.getHighlightContextById(oid, node.tagName, false);
                if (context) highlightedContext.push(context);
            }

            if (instanceId) {
                const context = await this.getHighlightContextById(instanceId, node.tagName, true);
                if (context) highlightedContext.push(context);
            }

            if (!oid && !instanceId) {
                console.error('No oid or instanceId found for node', node);
            }
        }

        return highlightedContext;
    }

    private async getHighlightContextById(
        id: string,
        tagName: string,
        isInstance: boolean,
    ): Promise<HighlightMessageContext | null> {
        const metadata = await this.editorEngine.codeEditor.getJsxElementMetadata(id);
        if (!metadata) {
            console.error('No metadata found for id', id);
            return null;
        }

        return {
            type: MessageContextType.HIGHLIGHT,
            displayName:
                isInstance && metadata.component ? metadata.component : tagName.toLowerCase(),
            path: metadata.path,
            content: metadata.code,
            start: metadata.startTag.start.line,
            end: metadata.endTag?.end.line || metadata.startTag.end.line,
            oid: id,
            branchId: metadata.branchId,
        };
    }

    getErrorContext(): ErrorMessageContext[] {
        const branchErrors = this.editorEngine.branches.getAllErrors();
        // Group errors by branch for context
        const branchGroups = new Map<string, ParsedError[]>();
        branchErrors.forEach((error) => {
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
                let fileContent: string | Uint8Array | null = null;
                try {
                    fileContent = await this.editorEngine.codeEditor.readFile(pagePath);
                } catch (error) {
                    console.error('Error getting default page context', error);
                    continue;
                }
                
                if (fileContent && typeof fileContent === 'string') {
                    const activeBranchId = this.editorEngine.branches.activeBranch?.id;
                    if (!activeBranchId) {
                        console.error('No active branch found for default page context');
                        continue;
                    }
                    const defaultPageContext: FileMessageContext = {
                        type: MessageContextType.FILE,
                        path: pagePath,
                        content: fileContent,
                        displayName: pagePath.split('/').pop() || 'page.tsx',
                        branchId: activeBranchId,
                    };
                    return defaultPageContext;
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
            };

            const cssContext: FileMessageContext = {
                type: MessageContextType.FILE,
                path: styleGuide.cssPath,
                content: styleGuide.cssContent,
                displayName: styleGuide.cssPath.split('/').pop() || 'globals.css',
                branchId: activeBranchId,
            };

            return [tailwindConfigContext, cssContext];
        } catch (error) {
            console.error('Error getting default style guide context', error);
            return null;
        }
    }

    clearImagesFromContext() {
        this.context = this.context.filter((context) => context.type !== MessageContextType.IMAGE);
    }

    clear() {
        this.selectedReactionDisposer?.();
        this.selectedReactionDisposer = undefined;
        this.context = [];
    }
}
