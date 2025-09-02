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
    private branchTemplateNodes = new Map<string, Map<string, TemplateNode>>();

    constructor(editorEngine: EditorEngine) {
        this.editorEngine = editorEngine;
        makeAutoObservable(this);
    }

    private getBranchMap(branchId: string): Map<string, TemplateNode> {
        let branchMap = this.branchTemplateNodes.get(branchId);
        if (!branchMap) {
            branchMap = new Map<string, TemplateNode>();
            this.branchTemplateNodes.set(branchId, branchMap);
        }
        return branchMap;
    }

    private getActiveBranchId(): string {
        const activeBranch = this.editorEngine.branches.activeBranch;
        if (!activeBranch) {
            throw new Error('No active branch found');
        }
        return activeBranch.id;
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

        const { ast: astWithIds, modified } = addOidsToAst(ast);

        // Format content then create map
        const unformattedContent = await getContentFromAst(astWithIds, content);
        const formattedContent = await formatContent(filePath, unformattedContent);
        const astWithIdsAndFormatted = getAstFromContent(formattedContent);
        const finalAst = astWithIdsAndFormatted ?? astWithIds;
        const templateNodeMap = createTemplateNodeMap({ ast: finalAst, filename: filePath, branchId });

        // Store template nodes for this branch
        const branchMap = this.getBranchMap(branchId);
        templateNodeMap.forEach((node, oid) => {
            branchMap.set(oid, node);
        });

        const newContent = await getContentFromAst(finalAst, content);
        return {
            modified,
            newContent,
        };
    }

    getTemplateNode(oid: string): TemplateNode | null {
        const branchId = this.getActiveBranchId();
        return this.getTemplateNodeByBranch(branchId, oid);
    }

    getTemplateNodeByBranch(branchId: string, oid: string): TemplateNode | null {
        const branchMap = this.branchTemplateNodes.get(branchId);
        return branchMap?.get(oid) ?? null;
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
        return this.branchTemplateNodes.get(branchId) ?? new Map();
    }

    getAllTemplateNodes(): Map<string, TemplateNode> {
        const activeBranchId = this.getActiveBranchId();
        return this.getBranchTemplateNodes(activeBranchId);
    }

    clearBranch(branchId: string): void {
        this.branchTemplateNodes.delete(branchId);
    }

    clear(): void {
        this.branchTemplateNodes.clear();
    }
}