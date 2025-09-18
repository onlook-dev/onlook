'use client';

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
import { UnifiedCacheManager } from '../cache/unified-cache';
import type { EditorEngine } from '../engine';
import { formatContent } from '../sandbox/helpers';

interface TemplateNodeCacheData {
    templateNodeMap: [string, TemplateNode][];
    modified: boolean;
    newContent: string;
}

export class TemplateNodeManager {
    private editorEngine: EditorEngine;
    private templateNodes = new Map<string, TemplateNode>();
    private processCache: UnifiedCacheManager<TemplateNodeCacheData>;
    private MAX_TEMPLATE_NODES = 2000; // Lower limit for better performance on dense pages

    constructor(editorEngine: EditorEngine, projectId: string) {
        this.editorEngine = editorEngine;
        this.processCache = new UnifiedCacheManager({
            name: `template-nodes-${projectId}`,
            maxItems: 200,
            maxSizeBytes: 25 * 1024 * 1024, // 25MB
            ttlMs: 1000 * 60 * 30, // 30 minutes
            persistent: true,
        });
        makeAutoObservable(this);
    }

    async init(): Promise<void> {
        await this.processCache.init();
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

    private async calculateContentHash(content: string): Promise<string> {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(content);
            const hashBuffer = await crypto.subtle.digest('SHA-1', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
        } catch (error) {
            // Fallback hash
            let hash = 0;
            for (let i = 0; i < content.length; i++) {
                const char = content.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash;
            }
            return Math.abs(hash).toString(36);
        }
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
        const shouldCache = content.length < 1024 * 1024; // 1MB limit
        const cacheKey = `${branchId}:${filePath}`;

        if (shouldCache) {
            const contentHash = await this.calculateContentHash(content);
            const cached = this.processCache.getCached(cacheKey, contentHash);

            if (cached) {
                // Restore template nodes from cache
                const templateNodeMap = new Map(cached.templateNodeMap);
                templateNodeMap.forEach((node, oid) => {
                    this.templateNodes.set(oid, node);
                });
                return {
                    modified: cached.modified,
                    newContent: cached.newContent,
                };
            }
        }

        // Process file normally
        const ast = getAstFromContent(content);
        if (!ast) {
            throw new Error(`Failed to get ast for file ${filePath}`);
        }

        if (isRootLayoutFile(filePath, routerType)) {
            injectPreloadScript(ast);
        }

        const globalOids = this.getAllOids();
        const branchOidMap = this.getBranchOidMap();
        const { ast: astWithIds, modified } = addOidsToAst(ast, globalOids, branchOidMap, branchId);

        const unformattedContent = await getContentFromAst(astWithIds, content);
        const formattedContent = await formatContent(filePath, unformattedContent);
        const astWithIdsAndFormatted = getAstFromContent(formattedContent);
        const finalAst = astWithIdsAndFormatted ?? astWithIds;
        const templateNodeMap = createTemplateNodeMap({ ast: finalAst, filename: filePath, branchId });

        // Store template nodes with size limit check
        templateNodeMap.forEach((node, oid) => {
            this.templateNodes.set(oid, node);
        });
        
        // If we've exceeded the max nodes, clean up old nodes
        if (this.templateNodes.size > this.MAX_TEMPLATE_NODES) {
            this.pruneOldTemplateNodes();
        }

        const newContent = await getContentFromAst(finalAst, content);

        // Cache the result
        if (shouldCache) {
            const contentHash = await this.calculateContentHash(content);
            const cacheData: TemplateNodeCacheData = {
                templateNodeMap: Array.from(templateNodeMap.entries()),
                modified,
                newContent,
            };
            this.processCache.set(cacheKey, cacheData, contentHash);
        }

        return { modified, newContent };
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

        return await getContentFromTemplateNode(templateNode, file.content);
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

    private pruneOldTemplateNodes(): void {
        // Keep only nodes from the active branch and limit the total size
        const activeBranchId = this.getActiveBranchId();
        const activeBranchNodes: [string, TemplateNode][] = [];
        const otherBranchNodes: [string, TemplateNode][] = [];
        
        for (const [oid, node] of this.templateNodes) {
            if (node.branchId === activeBranchId) {
                activeBranchNodes.push([oid, node]);
            } else {
                otherBranchNodes.push([oid, node]);
            }
        }
        
        // Clear the map and rebuild with limited nodes
        this.templateNodes.clear();
        
        // Keep all active branch nodes up to limit
        const nodesToKeep = Math.min(activeBranchNodes.length, Math.floor(this.MAX_TEMPLATE_NODES * 0.9));
        for (let i = 0; i < nodesToKeep; i++) {
            const entry = activeBranchNodes[i];
            if (entry) {
                const [oid, node] = entry;
                this.templateNodes.set(oid, node);
            }
        }
        
        // Fill remaining space with other branch nodes if any
        const remainingSpace = this.MAX_TEMPLATE_NODES - this.templateNodes.size;
        const otherNodesToKeep = Math.min(otherBranchNodes.length, remainingSpace);
        for (let i = 0; i < otherNodesToKeep; i++) {
            const entry = otherBranchNodes[i];
            if (entry) {
                const [oid, node] = entry;
                this.templateNodes.set(oid, node);
            }
        }
    }

    clearBranch(branchId: string): void {
        // Clear from template nodes
        for (const [oid, node] of this.templateNodes) {
            if (node.branchId === branchId) {
                this.templateNodes.delete(oid);
            }
        }

        // Clear from cache
        for (const key of this.processCache.keys()) {
            if (key.startsWith(`${branchId}:`)) {
                this.processCache.delete(key);
            }
        }
    }

    clear(): void {
        this.templateNodes.clear();
        this.processCache.clear();
    }
}