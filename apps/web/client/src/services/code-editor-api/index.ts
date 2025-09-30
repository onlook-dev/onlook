import type { TemplateNode } from '@onlook/models';
import { RouterType } from '@onlook/models';
import { FileSystem } from '@onlook/file-system';
import { 
    getAstFromContent, 
    addOidsToAst, 
    getContentFromAst,
    injectPreloadScript,
    createTemplateNodeMap,
    getContentFromTemplateNode
} from '@onlook/parser';
import { isRootLayoutFile } from '@onlook/utility';
import { formatContent } from '@/components/store/editor/sandbox/helpers';

// JsxElementMetadata extends TemplateNode with additional fields
export interface JsxElementMetadata extends TemplateNode {
    oid: string;
    code: string;
}

export type { JsxElementMetadata as JsxElementMetadataType };

export interface CodeEditorOptions {
    injectPreloadScript?: boolean; // Default: true
    routerType?: RouterType; // Default: RouterType.APP
}

export class CodeEditorApi extends FileSystem {
    private branchId: string;
    private options: Required<CodeEditorOptions>;
    private indexPath = '/.onlook/index.json';

    constructor(projectId: string, branchId: string, options: CodeEditorOptions = {}) {
        super(`/${projectId}/${branchId}`);
        this.branchId = branchId;
        this.options = {
            injectPreloadScript: options.injectPreloadScript ?? true,
            routerType: options.routerType ?? RouterType.APP,
        };
    }

    async initialize(): Promise<void> {
        await super.initialize();
        await this.buildIndex();
    }

    async writeFile(path: string, content: string | Uint8Array): Promise<void> {
        if (this.isJsxFile(path) && typeof content === 'string') {
            const processedContent = await this.processJsxFile(path, content);
            await super.writeFile(path, processedContent);
        } else {
            await super.writeFile(path, content);
        }
    }

    async writeFiles(files: Array<{path: string, content: string | Uint8Array}>): Promise<void> {
        await Promise.all(files.map(({path, content}) => 
            this.writeFile(path, content)
        ));
    }

    // Process JSX file: manage OIDs, inject scripts, format
    private async processJsxFile(path: string, content: string): Promise<string> {
        const ast = getAstFromContent(content);
        if (!ast) {
            console.warn(`Failed to parse ${path}, writing as-is`);
            return content;
        }

        // Inject preload script if needed
        if (this.options.injectPreloadScript && isRootLayoutFile(path, this.options.routerType)) {
            injectPreloadScript(ast);
        }

        // Get existing OIDs from this file to avoid duplicates
        const existingOids = await this.getFileOids(path);

        // Add/update OIDs - only replaces duplicates within file
        const { ast: processedAst, modified } = addOidsToAst(ast, existingOids);

        // Convert back to string
        const processedContent = await getContentFromAst(processedAst, content);

        // Format the content
        const formattedContent = await formatContent(path, processedContent);

        // Update metadata index if modified or scripts were injected
        if (modified || (this.options.injectPreloadScript && isRootLayoutFile(path, this.options.routerType))) {
            await this.updateMetadataForFile(path, formattedContent);
        }

        return formattedContent;
    }

    // Get existing OIDs from file (for duplicate detection)
    private async getFileOids(path: string): Promise<Set<string>> {
        const index = await this.loadIndex();
        
        const oids = new Set<string>();
        for (const [oid, metadata] of Object.entries(index)) {
            if (metadata.path === path) {
                oids.add(oid);
            }
        }
        return oids;
    }

    // Update metadata index for a file
    private async updateMetadataForFile(path: string, content: string): Promise<void> {
        const index = await this.loadIndex();

        // Remove old metadata for this file
        for (const [oid, metadata] of Object.entries(index)) {
            if (metadata.path === path) {
                delete index[oid];
            }
        }

        // Parse and add new metadata
        const ast = getAstFromContent(content);
        if (!ast) return;

        const templateNodeMap = createTemplateNodeMap({
            ast,
            filename: path,
            branchId: this.branchId,
        });

        // Convert TemplateNode to JsxElementMetadata and add to index
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

    // Public API - get metadata by OID
    async getJsxElementMetadata(oid: string): Promise<JsxElementMetadata | undefined> {
        const index = await this.loadIndex();
        const metadata = index[oid];
        if (!metadata) {
            console.warn(`[CodeEditorApi] No metadata found for OID: ${oid}. Total index size: ${Object.keys(index).length}`);
        }
        return metadata;
    }


    async buildIndex(): Promise<void> {
        console.log('[CodeEditorApi] Building OID index...');
        const startTime = Date.now();

        // Start with empty index
        let index: Record<string, JsxElementMetadata> = {};

        // Get all JSX files
        const entries = await this.listAll();
        const jsxFiles = entries.filter(
            entry => entry.type === 'file' && this.isJsxFile(entry.path)
        );

        console.log(`[CodeEditorApi] Processing ${jsxFiles.length} files...`);

        // Process in parallel batches
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

                            // Add to index
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
                })
            );
        }

        await this.saveIndex(index);
        
        const duration = Date.now() - startTime;
        console.log(
            `[CodeEditorApi] Index built: ${Object.keys(index).length} elements from ${processedCount} files in ${duration}ms`
        );
    }

    // Override deleteFile to clean up metadata
    async deleteFile(path: string): Promise<void> {
        await super.deleteFile(path);
        
        if (this.isJsxFile(path)) {
            const index = await this.loadIndex();
            let hasChanges = false;

            // Remove metadata for this file
            for (const [oid, metadata] of Object.entries(index)) {
                if (metadata.path === path) {
                    delete index[oid];
                    hasChanges = true;
                }
            }
            
            if (hasChanges) {
                await this.saveIndex(index);
            }
        }
    }

    // Override moveFile to update metadata paths
    async moveFile(oldPath: string, newPath: string): Promise<void> {
        await super.moveFile(oldPath, newPath);
        
        if (this.isJsxFile(oldPath) && this.isJsxFile(newPath)) {
            const index = await this.loadIndex();
            let hasChanges = false;

            // Update metadata paths
            for (const metadata of Object.values(index)) {
                if (metadata.path === oldPath) {
                    metadata.path = newPath;
                    hasChanges = true;
                }
            }
            
            if (hasChanges) {
                await this.saveIndex(index);
            }
        }
    }

    // Load index from filesystem
    private async loadIndex(): Promise<Record<string, JsxElementMetadata>> {
        try {
            const content = await this.readFile(this.indexPath);
            return JSON.parse(content as string);
        } catch {
            // No index yet, return empty
            return {};
        }
    }

    // Save index to filesystem
    private async saveIndex(index: Record<string, JsxElementMetadata>): Promise<void> {
        try {
            await this.createDirectory('/.onlook');
        } catch {
            // Directory might already exist, that's fine
        }
        await super.writeFile(this.indexPath, JSON.stringify(index));
    }

    // Utilities
    private isJsxFile(path: string): boolean {
        return /\.(jsx?|tsx?)$/i.test(path);
    }

    // Cleanup
    async cleanup(): Promise<void> {
        try {
            await this.deleteDirectory('/');
        } catch (error) {
            console.error('Error cleaning up:', error);
        }
    }
}