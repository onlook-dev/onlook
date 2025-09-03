import { RouterType, type TemplateNode } from '@onlook/models';
import {
    addOidsToAst,
    createTemplateNodeMap,
    getAstFromContent,
    getContentFromAst,
    getContentFromTemplateNode,
    getTemplateNodeChild,
    injectPreloadScript,
} from '@onlook/parser';
import { isRootLayoutFile } from '@onlook/utility/src/path';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../engine';
import { formatContent } from '../sandbox/helpers';

export class TemplateNodeManager {
    private editorEngine: EditorEngine;
    private templateNodes = new Map<string, TemplateNode>();

    constructor(editorEngine: EditorEngine) {
        this.editorEngine = editorEngine;
        makeAutoObservable(this);
    }

    private getActiveBranchId(): string {
        const activeBranch = this.editorEngine.branches.activeBranch;
        if (!activeBranch) {
            throw new Error('No active branch found');
        }
        return activeBranch.id;
    }

    getAllOids(): Set<string> {
        return new Set(this.templateNodes.keys());
    }

    getBranchOidMap(): Map<string, string> {
        const branchOidMap = new Map<string, string>();
        for (const [oid, node] of this.templateNodes) {
            branchOidMap.set(oid, node.branchId);
        }
        return branchOidMap;
    }

    async processFileForMapping(
        branchId: string,
        filePath: string,
        content: string,
        routerType: RouterType = RouterType.APP,
    ): Promise<{
        modified: boolean;
        newContent: string;
    }> {
        const ast = getAstFromContent(content);
        if (!ast) {
            throw new Error(`Failed to get ast for file ${filePath}`);
        }

        if (isRootLayoutFile(filePath, routerType)) {
            injectPreloadScript(ast);
        }

        // Get global OIDs and branch mapping for conflict checking
        const globalOids = this.getAllOids();
        const branchOidMap = this.getBranchOidMap();
        const { ast: astWithIds, modified } = addOidsToAst(ast, globalOids, branchOidMap, branchId);

        // Format content then create map
        const unformattedContent = await getContentFromAst(astWithIds, content);
        const formattedContent = await formatContent(filePath, unformattedContent);
        const astWithIdsAndFormatted = getAstFromContent(formattedContent);
        const finalAst = astWithIdsAndFormatted ?? astWithIds;
        const templateNodeMap = createTemplateNodeMap({ ast: finalAst, filename: filePath, branchId });

        // Store template nodes in single map (overwrites any existing nodes with same OID)
        templateNodeMap.forEach((node, oid) => {
            this.templateNodes.set(oid, node);
        });

        const newContent = await getContentFromAst(finalAst, content);
        return {
            modified,
            newContent,
        };
    }

    getTemplateNode(oid: string): TemplateNode | null {
        return this.templateNodes.get(oid) ?? null;
    }

    getTemplateNodeByBranch(branchId: string, oid: string): TemplateNode | null {
        const templateNode = this.templateNodes.get(oid);
        return templateNode && templateNode.branchId === branchId ? templateNode : null;
    }

    async getTemplateNodeChild(
        parentOid: string,
        child: TemplateNode,
        index: number,
    ): Promise<{ instanceId: string; component: string } | null> {
        const codeBlock = await this.getCodeBlock(parentOid);

        if (codeBlock == null) {
            console.error(`Failed to read code block: ${parentOid}`);
            return null;
        }

        return await getTemplateNodeChild(codeBlock, child, index);
    }

    async getCodeBlock(oid: string): Promise<string | null> {
        const templateNode = this.getTemplateNode(oid);
        if (!templateNode) {
            console.error(`No template node found for oid ${oid}`);
            return null;
        }

        // Get the sandbox for this template node's branch
        const sandbox = this.editorEngine.branches.getSandboxById(templateNode.branchId);
        if (!sandbox) {
            console.error(`No sandbox found for branch ${templateNode.branchId}`);
            return null;
        }

        const file = await sandbox.readFile(templateNode.path);
        if (!file) {
            console.error(`No file found for template node ${oid}`);
            return null;
        }

        if (file.type === 'binary') {
            console.error(`File ${templateNode.path} is a binary file`);
            return null;
        }

        const codeBlock = await getContentFromTemplateNode(templateNode, file.content);
        return codeBlock;
    }

    getBranchTemplateNodes(branchId: string): Map<string, TemplateNode> {
        const branchNodes = new Map<string, TemplateNode>();
        for (const [oid, node] of this.templateNodes) {
            if (node.branchId === branchId) {
                branchNodes.set(oid, node);
            }
        }
        return branchNodes;
    }

    getAllTemplateNodes(): Map<string, TemplateNode> {
        const activeBranchId = this.getActiveBranchId();
        return this.getBranchTemplateNodes(activeBranchId);
    }

    clearBranch(branchId: string): void {
        for (const [oid, node] of this.templateNodes) {
            if (node.branchId === branchId) {
                this.templateNodes.delete(oid);
            }
        }
    }

    clear(): void {
        this.templateNodes.clear();
    }
}