import { ChatType, type DomElement } from '@onlook/models';
import {
    MessageContextType,
    type AgentRuleMessageContext,
    type BranchMessageContext,
    type ErrorMessageContext,
    type FileMessageContext,
    type HighlightMessageContext,
    type MessageContext
} from '@onlook/models/chat';
import { assertNever, type ParsedError } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
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
            ) => {
                this.generateContextFromReaction({ elements, frames }).then((context) => {
                    // Preserve some context when edited element changes
                    const allHighlights = this._context.filter(c => c.type === MessageContextType.HIGHLIGHT);
                    const manualCodeEditorHighlights = allHighlights.filter(c => c.oid === undefined);
                    const existingImages = this._context.filter(
                        (c) => c.type === MessageContextType.IMAGE
                    );
                    this.context = [...context, ...manualCodeEditorHighlights, ...existingImages];
                });
            },
        );
    }

    get context(): MessageContext[] {
        return this._context;
    }

    set context(context: MessageContext[]) {
        this._context = context;
    }

    addContexts(contexts: MessageContext[]) {
        const newContexts = [...this._context, ...contexts];

        // Deduplicate file contexts by path and branchId
        const fileMap = new Map<string, FileMessageContext>();
        // Deduplicate highlight contexts by path, start, end, and branchId
        const highlightMap = new Map<string, HighlightMessageContext>();
        const otherContexts: MessageContext[] = [];

        for (const context of newContexts) {
            if (context.type === MessageContextType.FILE) {
                const key = `${context.path}::${context.branchId}`;
                // Keep the most recent file context (last one wins)
                fileMap.set(key, context);
            } else if (context.type === MessageContextType.HIGHLIGHT) {
                const key = `${context.path}::${context.start}::${context.end}::${context.branchId}`;
                // Keep the most recent highlight context (last one wins)
                highlightMap.set(key, context);
            } else {
                otherContexts.push(context);
            }
        }

        this._context = [...Array.from(fileMap.values()), ...Array.from(highlightMap.values()), ...otherContexts];
    }

    addHighlightContext(path: string, content: string, start: number, end: number, branchId: string, displayName: string) {
        const highlightContext: HighlightMessageContext = {
            type: MessageContextType.HIGHLIGHT,
            path,
            content,
            displayName,
            start,
            end,
            branchId,
        };
        this.addContexts([highlightContext]);
    }

    async getContextByChatType(type: ChatType): Promise<MessageContext[]> {
        switch (type) {
            case ChatType.EDIT:
            case ChatType.CREATE:
            case ChatType.ASK:
                return await this.getChatEditContext();
            case ChatType.FIX:
                return this.getErrorContext();
            default:
                assertNever(type);
        }
    }

    async getChatEditContext(): Promise<MessageContext[]> {
        return [
            ...await this.getRefreshedContext(this.context),
            ...await this.getAgentRuleContext()
        ];
    }

    private async generateContextFromReaction({ elements, frames }: { elements: DomElement[], frames: FrameData[] }): Promise<MessageContext[]> {
        let highlightedContext: HighlightMessageContext[] = [];
        if (elements.length) {
            highlightedContext = await this.getHighlightedContext(elements);
        }

        // Derived from highlighted context - images are managed separately now
        const fileContext = await this.getFileContext(highlightedContext);
        const branchContext = this.getBranchContext(highlightedContext, frames);
        const context = [...fileContext, ...highlightedContext, ...branchContext];
        return context;
    }

    async getRefreshedContext(context: MessageContext[]): Promise<MessageContext[]> {
        // Refresh the context if possible. Files and highlight content may have changed since the last time they were added to the context.
        // Images are not refreshed as they are not editable.
        return (await Promise.all(
            context.map(async (c) => {
                if (c.type === MessageContextType.FILE && 'branchId' in c && c.branchId) {
                    const branchData = this.editorEngine.branches.getBranchDataById(c.branchId);
                    if (!branchData) {
                        console.warn(`No branch data found for branchId: ${c.branchId}`);
                        return c;
                    }

                    const fileContent = await branchData.codeEditor.readFile(c.path);
                    if (fileContent instanceof Uint8Array) {
                        console.error('File is binary', c.path);
                        return c;
                    }
                    return { ...c, content: fileContent } satisfies FileMessageContext;
                } else if (c.type === MessageContextType.HIGHLIGHT && c.oid && 'branchId' in c && c.branchId) {
                    const branchData = this.editorEngine.branches.getBranchDataById(c.branchId);
                    if (!branchData) {
                        console.warn(`No branch data found for branchId: ${c.branchId}`);
                        return c;
                    }

                    const metadata = await branchData.codeEditor.getJsxElementMetadata(c.oid);
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

    private async getFileContext(highlightedContext: HighlightMessageContext[]): Promise<FileMessageContext[]> {
        const fileContext: FileMessageContext[] = [];

        // Create a map of file path to branch ID from highlighted context
        const filePathToBranch = new Map<string, string>();
        highlightedContext.forEach(highlight => {
            filePathToBranch.set(highlight.path, highlight.branchId);
        });

        for (const [filePath, branchId] of filePathToBranch) {
            const branchData = this.editorEngine.branches.getBranchDataById(branchId);
            if (!branchData) {
                console.warn(`No branch data found for branchId: ${branchId}`);
                continue;
            }

            const content = await branchData.codeEditor.readFile(filePath);
            if (content instanceof Uint8Array) {
                console.error('File is binary', filePath);
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
                const context = await this.getHighlightContextById(oid, node.tagName, false, node.branchId);
                if (context) highlightedContext.push(context);
            }

            if (instanceId) {
                const context = await this.getHighlightContextById(instanceId, node.tagName, true, node.branchId);
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
        branchId: string,
    ): Promise<HighlightMessageContext | null> {
        const branchData = this.editorEngine.branches.getBranchDataById(branchId);
        if (!branchData) {
            console.warn(`No branch data found for branchId: ${branchId}`);
            return null;
        }

        const metadata = await branchData.codeEditor.getJsxElementMetadata(id);
        if (!metadata) {
            console.error('No metadata found for id', id, 'tagName:', tagName);
            return null;
        }

        const highlight: HighlightMessageContext = {
            type: MessageContextType.HIGHLIGHT,
            displayName:
                isInstance && metadata.component ? metadata.component : tagName.toLowerCase(),
            path: metadata.path,
            content: metadata.code,
            start: metadata.startTag.start.line,
            end: metadata.endTag?.end.line || metadata.startTag.end.line,
            oid: id,
            branchId: branchId,
        };

        return highlight;
    }

    private async getAgentRuleContext(): Promise<AgentRuleMessageContext[]> {
        try {
            const agentRuleFileNames = ['agents.md', 'claude.md', 'AGENTS.md', 'CLAUDE.md'];
            const sandbox = this.editorEngine.activeSandbox;
            const agentRuleContexts: AgentRuleMessageContext[] = (await Promise.all(
                agentRuleFileNames.map(async (fileName) => {
                    const filePath = `./${fileName}`;
                    if (!sandbox.fileExists(filePath)) {
                        return null;
                    }
                    const fileContent = await this.editorEngine.activeSandbox.readFile(filePath);
                    if (fileContent === null || fileContent instanceof Uint8Array) {
                        return null;
                    }
                    if (fileContent.trim().length === 0) {
                        return null;
                    }
                    return {
                        type: MessageContextType.AGENT_RULE,
                        content: fileContent,
                        displayName: fileName,
                        path: filePath,
                    } satisfies AgentRuleMessageContext;
                })
            )).filter((context) => context !== null);
            return agentRuleContexts
        } catch (error) {
            console.error('Error getting agent rule context', error);
            return [];
        }
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
            const activeBranchId = this.editorEngine.branches.activeBranch?.id;
            if (!activeBranchId) {
                console.error('No active branch found for default page context');
                return null;
            }

            const branchData = this.editorEngine.branches.getBranchDataById(activeBranchId);
            if (!branchData) {
                console.error(`No branch data found for activeBranchId: ${activeBranchId}`);
                return null;
            }

            const pagePaths = ['./app/page.tsx', './src/app/page.tsx'];
            for (const pagePath of pagePaths) {
                let fileContent: string | Uint8Array | null = null;
                try {
                    fileContent = await branchData.codeEditor.readFile(pagePath);
                } catch (error) {
                    console.error('Error getting default page context', error);
                    continue;
                }

                if (fileContent && typeof fileContent === 'string') {
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
        this.context = this.context.filter(
            (c) => c.type !== MessageContextType.IMAGE
        );
    }

    clear() {
        this.selectedReactionDisposer?.();
        this.selectedReactionDisposer = undefined;
        this.context = [];
    }
}
