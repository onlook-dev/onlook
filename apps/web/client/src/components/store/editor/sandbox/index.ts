import type { FileInfo } from '@e2b/sdk';
import { EXCLUDED_SYNC_DIRECTORIES, JSX_FILE_EXTENSIONS } from '@onlook/constants';
import { type SandboxFile, type TemplateNode } from '@onlook/models';
import { getContentFromTemplateNode, getTemplateNodeChild } from '@onlook/parser';
import { getBaseName, getDirName, isImageFile, isSubdirectory, LogTimer } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
import path from 'path';
import type { EditorEngine } from '../engine';
import { FileEventBus } from './file-event-bus';
import { FileSyncManager } from './file-sync';
import { FileWatcher } from './file-watcher';
import { formatContent, normalizePath } from './helpers';
import { TemplateNodeMapper } from './mapping';
import { SessionManager } from './session';

export class SandboxManager {
    readonly session: SessionManager;
    readonly mapper: TemplateNodeMapper;
    readonly fileEventBus: FileEventBus;
    readonly fileSync: FileSyncManager;
    readonly fileWatcher: FileWatcher;
    isIndexing: boolean = false;
    isIndexed: boolean = false;

    constructor(private readonly editorEngine: EditorEngine) {
        this.session = new SessionManager(editorEngine);
        this.mapper = new TemplateNodeMapper();
        this.fileEventBus = new FileEventBus();
        this.fileSync = new FileSyncManager();
        this.fileWatcher = new FileWatcher({
            session: null as any, // Will be set when connected
            onFileChange: this.handleFileChange.bind(this),
            excludePatterns: EXCLUDED_SYNC_DIRECTORIES,
            fileEventBus: this.fileEventBus,
        });

        makeAutoObservable(this);

        reaction(
            () => this.editorEngine.code.isExecuting,
            (isExecuting) => this.fileWatcher.setEnabled(!isExecuting),
        );
    }

    async index(force = false) {
        if (this.isIndexing || (this.isIndexed && !force)) {
            return;
        }

        if (!this.session.session) {
            console.error('No session found');
            return;
        }

        this.isIndexing = true;
        const timer = new LogTimer('Sandbox Indexing');

        try {
            // Get all file paths
            const allFilePaths = await this.getAllFilePathsFlat('./', EXCLUDED_SYNC_DIRECTORIES);
            timer.log(`File discovery completed - ${allFilePaths.length} files found`);

            for (const filePath of allFilePaths) {
                // Track image files first
                if (isImageFile(filePath)) {
                    this.fileSync.writeEmptyFile(filePath, 'binary');
                    continue;
                }
                const remoteFile = await this.readRemoteFile(filePath);
                if (remoteFile) {
                    this.fileSync.updateCache(remoteFile);
                    if (this.isJsxFile(filePath)) {
                        await this.processFileForMapping(remoteFile);
                    }
                }
            }

            await this.watchFiles();
            this.isIndexed = true;
            timer.log('Indexing completed successfully');
        } catch (error) {
            console.error('Error during indexing:', error);
            throw error;
        } finally {
            this.isIndexing = false;
        }
    }

    async watchFiles() {
        if (!this.session.session) {
            console.error('No session for file watching');
            return;
        }

        // E2B doesn't have built-in file watching, so we'll poll for changes
        // This is a simplified implementation
        console.log('File watching started (polling mode)');
    }

    async readRemoteFile(remotePath: string): Promise<SandboxFile | null> {
        if (!this.session.session) {
            console.error('No session found');
            return null;
        }

        try {
            const normalizedPath = normalizePath(remotePath);
            const content = await this.session.session.filesystem.read(normalizedPath);
            
            return {
                path: normalizedPath,
                content: typeof content === 'string' ? content : content.toString(),
                type: 'text',
            };
        } catch (error) {
            console.error(`Error reading file ${remotePath}:`, error);
            return null;
        }
    }

    async writeRemoteFile(remotePath: string, content: string): Promise<boolean> {
        if (!this.session.session) {
            console.error('No session found');
            return false;
        }

        try {
            const normalizedPath = normalizePath(remotePath);
            await this.session.session.filesystem.write(normalizedPath, content);
            return true;
        } catch (error) {
            console.error(`Error writing file ${remotePath}:`, error);
            return false;
        }
    }

    async getAllFilePathsFlat(
        dirPath: string,
        excludePatterns: string[] = [],
        filePaths: string[] = [],
    ): Promise<string[]> {
        if (!this.session.session) {
            return filePaths;
        }

        try {
            const files = await this.session.session.filesystem.list(dirPath);
            
            for (const file of files) {
                const fullPath = path.join(dirPath, file.name);
                
                // Check if should exclude
                const shouldExclude = excludePatterns.some(pattern => 
                    fullPath.includes(pattern) || file.name === pattern
                );
                
                if (shouldExclude) {
                    continue;
                }

                if (file.isDir) {
                    await this.getAllFilePathsFlat(fullPath, excludePatterns, filePaths);
                } else {
                    filePaths.push(fullPath);
                }
            }
        } catch (error) {
            console.error(`Error listing directory ${dirPath}:`, error);
        }

        return filePaths;
    }

    async getRemoteDirectoryStructure(
        dirPath: string,
        excludePatterns: string[] = [],
    ): Promise<FileInfo[]> {
        if (!this.session.session) {
            return [];
        }

        try {
            const files = await this.session.session.filesystem.list(dirPath);
            const result: FileInfo[] = [];

            for (const file of files) {
                const fullPath = path.join(dirPath, file.name);
                
                // Check if should exclude
                const shouldExclude = excludePatterns.some(pattern => 
                    fullPath.includes(pattern) || file.name === pattern
                );
                
                if (!shouldExclude) {
                    result.push({
                        name: file.name,
                        path: fullPath,
                        isDir: file.isDir,
                    });
                }
            }

            return result;
        } catch (error) {
            console.error(`Error getting directory structure for ${dirPath}:`, error);
            return [];
        }
    }

    async handleFileChange(event: { path: string; type: string }) {
        if (!this.session.session) {
            return;
        }

        if (event.type === 'change' || event.type === 'add') {
            const remoteFile = await this.readRemoteFile(event.path);
            if (remoteFile) {
                this.fileSync.updateCache(remoteFile);
                if (this.isJsxFile(event.path)) {
                    await this.processFileForMapping(remoteFile);
                }
            }
        } else if (event.type === 'unlink') {
            this.fileSync.removeFromCache(event.path);
            this.mapper.removeFile(event.path);
        }
    }

    isJsxFile(filePath: string): boolean {
        const ext = path.extname(filePath).toLowerCase();
        return JSX_FILE_EXTENSIONS.includes(ext);
    }

    private async processFileForMapping(file: SandboxFile) {
        try {
            this.mapper.updateFile(file.path, file.content);
        } catch (error) {
            console.error(`Error processing file ${file.path} for mapping:`, error);
        }
    }

    getTemplateNode(templateNode: TemplateNode): TemplateNode | undefined {
        const fileContent = this.fileSync.get(templateNode.path);
        if (!fileContent) {
            return;
        }

        const content = getContentFromTemplateNode(templateNode, fileContent.content);
        const domNode = this.editorEngine.dom.getDomNode(templateNode.domId);
        if (!domNode) {
            console.error(`DOM node not found for template node: ${templateNode.domId}`);
            return;
        }

        const childTemplateNode = getTemplateNodeChild(templateNode, domNode, fileContent.content);
        return childTemplateNode;
    }

    clear() {
        this.session.disconnect();
        this.mapper.clear();
        this.fileSync.clear();
        this.fileEventBus.clear();
        this.isIndexed = false;
    }

    async downloadFiles(projectName: string): Promise<{ downloadUrl: string } | null> {
        if (!this.session.session || !this.editorEngine.project?.sandbox?.id) {
            console.error('No session or sandbox ID found');
            return null;
        }

        try {
            // Use the sandbox router to get download URL
            const result = await this.editorEngine.api.sandbox.downloadFiles.mutate({
                sandboxId: this.editorEngine.project.sandbox.id,
                folderPath: '/',
            });

            return { downloadUrl: result.downloadUrl };
        } catch (error) {
            console.error('Failed to download files:', error);
            return null;
        }
    }
}
