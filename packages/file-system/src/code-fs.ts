import debounce from 'lodash.debounce';

import { ONLOOK_CACHE_DIRECTORY, ONLOOK_PRELOAD_SCRIPT_FILE } from '@onlook/constants';
import { RouterType } from '@onlook/models';
import {
    addOidsToAst,
    createTemplateNodeMap,
    formatContent,
    getAstFromContent,
    getContentFromAst,
    getContentFromTemplateNode,
    injectPreloadScript,
} from '@onlook/parser';
import { isRootLayoutFile, pathsEqual } from '@onlook/utility';

import type { JsxElementMetadata } from './index-cache';
import { FileSystem } from './fs';
import {
    clearIndexCache,
    getIndexFromCache,
    getOrLoadIndex,
    saveIndexToCache,
} from './index-cache';

export type { JsxElementMetadata } from './index-cache';

export interface CodeEditorOptions {
    routerType?: RouterType;
}

export class CodeFileSystem extends FileSystem {
    private projectId: string;
    private branchId: string;
    private options: Required<CodeEditorOptions>;
    private indexPath = `${ONLOOK_CACHE_DIRECTORY}/index.json`;

    constructor(projectId: string, branchId: string, options: CodeEditorOptions = {}) {
        super(`/${projectId}/${branchId}`);
        this.projectId = projectId;
        this.branchId = branchId;
        this.options = {
            routerType: options.routerType ?? RouterType.APP,
        };
    }

    async writeFile(path: string, content: string | Uint8Array): Promise<void> {
        const perfEnabled = typeof window !== 'undefined' && (window as any).__ONLOOK_PERF_LOG;
        const startTime = perfEnabled ? performance.now() : 0;

        if (this.isJsxFile(path) && typeof content === 'string') {
            const processStart = perfEnabled ? performance.now() : 0;
            const processedContent = await this.processJsxFile(path, content);
            const processDuration = perfEnabled ? performance.now() - processStart : 0;

            const writeStart = perfEnabled ? performance.now() : 0;
            await super.writeFile(path, processedContent);
            const writeDuration = perfEnabled ? performance.now() - writeStart : 0;

            if (perfEnabled) {
                const totalDuration = performance.now() - startTime;
                console.log(`[PERF] CodeFileSystem.writeFile(${path.split('/').pop()}): ${totalDuration.toFixed(0)}ms`);
                console.log(`  ├─ processJsxFile: ${processDuration.toFixed(0)}ms`);
                console.log(`  └─ super.writeFile: ${writeDuration.toFixed(0)}ms`);
            }
        } else {
            await super.writeFile(path, content);
            if (perfEnabled) {
                const totalDuration = performance.now() - startTime;
                console.log(`[PERF] CodeFileSystem.writeFile(${path.split('/').pop()}) [non-JSX]: ${totalDuration.toFixed(0)}ms`);
            }
        }
    }

    async writeFiles(files: Array<{ path: string; content: string | Uint8Array }>): Promise<void> {
        // Write files sequentially to avoid race conditions to metadata file
        for (const { path, content } of files) {
            await this.writeFile(path, content);
        }
    }

    private async processJsxFile(path: string, content: string): Promise<string> {
        const perfEnabled = typeof window !== 'undefined' && (window as any).__ONLOOK_PERF_LOG;
        let processedContent = content;

        // Parse AST (synchronous, potentially blocking)
        const parseStart = perfEnabled ? performance.now() : 0;
        const ast = getAstFromContent(content);
        const parseDuration = perfEnabled ? performance.now() - parseStart : 0;

        if (ast) {
            if (isRootLayoutFile(path, this.options.routerType)) {
                injectPreloadScript(ast);
            }

            const oidsStart = perfEnabled ? performance.now() : 0;
            const existingOids = await this.getFileOids(path);
            const oidsDuration = perfEnabled ? performance.now() - oidsStart : 0;

            // Add OIDs (synchronous, potentially blocking)
            const addOidsStart = perfEnabled ? performance.now() : 0;
            const { ast: processedAst } = addOidsToAst(ast, existingOids);
            const addOidsDuration = perfEnabled ? performance.now() - addOidsStart : 0;

            const getContentStart = perfEnabled ? performance.now() : 0;
            processedContent = await getContentFromAst(processedAst, content);
            const getContentDuration = perfEnabled ? performance.now() - getContentStart : 0;

            if (perfEnabled) {
                console.log(`    ├─ parseAST: ${parseDuration.toFixed(0)}ms ${parseDuration > 50 ? '⚠️' : ''}`);
                console.log(`    ├─ getFileOids: ${oidsDuration.toFixed(0)}ms`);
                console.log(`    ├─ addOidsToAst: ${addOidsDuration.toFixed(0)}ms ${addOidsDuration > 50 ? '⚠️' : ''}`);
                console.log(`    ├─ getContentFromAst: ${getContentDuration.toFixed(0)}ms`);
            }
        } else {
            console.warn(`Failed to parse ${path}, skipping OID injection but will still format`);
        }

        // Format content (synchronous Prettier, definitely blocking for large files)
        const formatStart = perfEnabled ? performance.now() : 0;
        const formattedContent = await formatContent(path, processedContent);
        const formatDuration = perfEnabled ? performance.now() - formatStart : 0;

        const metadataStart = perfEnabled ? performance.now() : 0;
        await this.updateMetadataForFile(path, formattedContent);
        const metadataDuration = perfEnabled ? performance.now() - metadataStart : 0;

        if (perfEnabled) {
            console.log(`    ├─ formatContent: ${formatDuration.toFixed(0)}ms ${formatDuration > 100 ? '⚠️ BLOCKING' : formatDuration > 50 ? '⚠️' : ''}`);
            console.log(`    └─ updateMetadata: ${metadataDuration.toFixed(0)}ms`);
        }

        return formattedContent;
    }

    private async getFileOids(path: string): Promise<Set<string>> {
        const index = await this.loadIndex();

        const oids = new Set<string>();
        for (const [oid, metadata] of Object.entries(index)) {
            if (pathsEqual(metadata.path, path)) {
                oids.add(oid);
            }
        }
        return oids;
    }

    private async updateMetadataForFile(path: string, content: string): Promise<void> {
        const index = await this.loadIndex();

        for (const [oid, metadata] of Object.entries(index)) {
            if (pathsEqual(metadata.path, path)) {
                delete index[oid];
            }
        }

        const ast = getAstFromContent(content);
        if (!ast) return;

        const templateNodeMap = createTemplateNodeMap({
            ast,
            filename: path,
            branchId: this.branchId,
        });

        for (const [oid, node] of templateNodeMap.entries()) {
            const code = await getContentFromTemplateNode(node, content);
            const metadata: JsxElementMetadata = {
                ...node,
                oid,
                code: code || '',
            };
            index[oid] = metadata;
        }

        await this.saveIndex(index);
    }

    async getJsxElementMetadata(oid: string): Promise<JsxElementMetadata | undefined> {
        const index = await this.loadIndex();
        const metadata = index[oid];
        if (!metadata) {
            console.warn(
                `[CodeEditorApi] No metadata found for OID: ${oid}. Total index size: ${Object.keys(index).length}`,
            );
        }
        return metadata;
    }

    async rebuildIndex(): Promise<void> {
        const startTime = Date.now();
        const index: Record<string, JsxElementMetadata> = {};

        const entries = await this.listAll();
        const jsxFiles = entries.filter(
            (entry) => entry.type === 'file' && this.isJsxFile(entry.path),
        );

        const BATCH_SIZE = 10;
        let processedCount = 0;

        for (let i = 0; i < jsxFiles.length; i += BATCH_SIZE) {
            const batch = jsxFiles.slice(i, i + BATCH_SIZE);
            await Promise.all(
                batch.map(async (entry) => {
                    try {
                        const content = await this.readFile(entry.path);
                        if (typeof content === 'string') {
                            const ast = getAstFromContent(content);
                            if (!ast) return;

                            const templateNodeMap = createTemplateNodeMap({
                                ast,
                                filename: entry.path,
                                branchId: this.branchId,
                            });

                            for (const [oid, node] of templateNodeMap.entries()) {
                                const code = await getContentFromTemplateNode(node, content);
                                index[oid] = {
                                    ...node,
                                    oid,
                                    code: code || '',
                                };
                            }

                            processedCount++;
                        }
                    } catch (error) {
                        console.error(`Error indexing ${entry.path}:`, error);
                    }
                }),
            );
        }

        await this.saveIndex(index);

        const duration = Date.now() - startTime;
        console.log(
            `[CodeEditorApi] Index built: ${Object.keys(index).length} elements from ${processedCount} files in ${duration}ms`,
        );
    }

    async deleteFile(path: string): Promise<void> {
        await super.deleteFile(path);

        if (this.isJsxFile(path)) {
            const index = await this.loadIndex();
            let hasChanges = false;

            for (const [oid, metadata] of Object.entries(index)) {
                if (pathsEqual(metadata.path, path)) {
                    delete index[oid];
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                await this.saveIndex(index);
            }
        }
    }

    async moveFile(oldPath: string, newPath: string): Promise<void> {
        await super.moveFile(oldPath, newPath);

        if (this.isJsxFile(oldPath) && this.isJsxFile(newPath)) {
            const index = await this.loadIndex();
            let hasChanges = false;

            for (const metadata of Object.values(index)) {
                if (pathsEqual(metadata.path, oldPath)) {
                    metadata.path = newPath;
                    hasChanges = true;
                }
            }

            if (hasChanges) {
                await this.saveIndex(index);
            }
        }
    }

    private async loadIndex(): Promise<Record<string, JsxElementMetadata>> {
        return getOrLoadIndex(this.getCacheKey(), this.indexPath, (path) => this.readFile(path));
    }

    private async saveIndex(index: Record<string, JsxElementMetadata>): Promise<void> {
        saveIndexToCache(this.getCacheKey(), index);
        void this.debouncedSaveIndexToFile();
    }

    private async undobounceSaveIndexToFile(): Promise<void> {
        try {
            await this.createDirectory(ONLOOK_CACHE_DIRECTORY);
        } catch {
            console.warn(`[CodeEditorApi] Failed to create ${ONLOOK_CACHE_DIRECTORY} directory`);
        }
        const index = getIndexFromCache(this.getCacheKey());
        if (index) {
            await super.writeFile(this.indexPath, JSON.stringify(index));
        }
    }

    private debouncedSaveIndexToFile = debounce(this.undobounceSaveIndexToFile, 1000);

    private isJsxFile(path: string): boolean {
        // Exclude the onlook preload script from JSX processing
        if (path.endsWith(ONLOOK_PRELOAD_SCRIPT_FILE)) {
            return false;
        }
        return /\.(jsx?|tsx?)$/i.test(path);
    }

    async cleanup(): Promise<void> {
        const cacheKey = this.getCacheKey();
        if (getIndexFromCache(cacheKey)) {
            await this.undobounceSaveIndexToFile();
        }

        clearIndexCache(cacheKey);
    }

    private getCacheKey(): string {
        return `${this.projectId}/${this.branchId}`;
    }
}
