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
            session: null, // Will be set when connected
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

        // Update the file watcher with the current session
        this.fileWatcher.updateSession(this.session.session);
        
        // Start watching files
        await this.fileWatcher.start();
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

    async readDir(dirPath: string): Promise<FileInfo[]> {
        if (!this.session.session) {
            return [];
        }

        try {
            const files = await this.session.session.filesystem.list(dirPath);
            return files.map(file => ({
                name: file.name,
                path: path.join(dirPath, file.name),
                isDir: file.isDir,
            }));
        } catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error);
            return [];
        }
    }

    async delete(filePath: string, recursive: boolean = false): Promise<boolean> {
        if (!this.session.session) {
            console.error('No session found for delete operation');
            return false;
        }

        try {
            const normalizedPath = normalizePath(filePath);
            
            // Check if it's a directory
            const stat = await this.session.session.filesystem.stat(normalizedPath);
            if (stat && stat.isDir && recursive) {
                // Delete directory recursively
                await this.deleteDirectoryRecursive(normalizedPath);
            } else {
                // Delete single file
                await this.session.session.filesystem.remove(normalizedPath);
            }

            // Clean up cache
            this.fileSync.removeFromCache(normalizedPath);
            this.mapper.removeFile(normalizedPath);

            // Publish deletion event
            this.fileEventBus.publish({
                type: 'remove',
                paths: [normalizedPath],
                timestamp: Date.now(),
            });

            return true;
        } catch (error) {
            console.error(`Error deleting ${filePath}:`, error);
            return false;
        }
    }

    private async deleteDirectoryRecursive(dirPath: string): Promise<void> {
        if (!this.session.session) {
            return;
        }

        const files = await this.session.session.filesystem.list(dirPath);
        
        for (const file of files) {
            const fullPath = path.join(dirPath, file.name);
            if (file.isDir) {
                await this.deleteDirectoryRecursive(fullPath);
            } else {
                await this.session.session.filesystem.remove(fullPath);
            }
        }
        
        // Remove the directory itself
        await this.session.session.filesystem.remove(dirPath);
    }

    async rename(oldPath: string, newPath: string): Promise<boolean> {
        if (!this.session.session) {
            console.error('No session found for rename operation');
            return false;
        }

        try {
            const normalizedOldPath = normalizePath(oldPath);
            const normalizedNewPath = normalizePath(newPath);

            // Read the content first
            const content = await this.session.session.filesystem.read(normalizedOldPath);
            
            // Create the new file
            await this.session.session.filesystem.write(normalizedNewPath, content);
            
            // Delete the old file
            await this.session.session.filesystem.remove(normalizedOldPath);

            // Update cache
            const file = this.fileSync.get(normalizedOldPath);
            if (file) {
                this.fileSync.removeFromCache(normalizedOldPath);
                this.fileSync.updateCache({
                    ...file,
                    path: normalizedNewPath,
                });
            }

            // Update mapper
            this.mapper.removeFile(normalizedOldPath);
            if (file && this.isJsxFile(normalizedNewPath)) {
                this.mapper.updateFile(normalizedNewPath, file.content);
            }

            // Publish rename event
            this.fileEventBus.publish({
                type: 'rename',
                paths: [normalizedOldPath, normalizedNewPath],
                timestamp: Date.now(),
            });

            return true;
        } catch (error) {
            console.error(`Error renaming ${oldPath} to ${newPath}:`, error);
            return false;
        }
    }

    async copy(sourcePath: string, targetPath: string, recursive: boolean = false): Promise<boolean> {
        if (!this.session.session) {
            console.error('No session found for copy operation');
            return false;
        }

        try {
            const normalizedSourcePath = normalizePath(sourcePath);
            const normalizedTargetPath = normalizePath(targetPath);

            // Check if source is a directory
            const stat = await this.session.session.filesystem.stat(normalizedSourcePath);
            if (stat && stat.isDir && recursive) {
                await this.copyDirectoryRecursive(normalizedSourcePath, normalizedTargetPath);
            } else {
                // Copy single file
                const content = await this.session.session.filesystem.read(normalizedSourcePath);
                await this.session.session.filesystem.write(normalizedTargetPath, content);
            }

            return true;
        } catch (error) {
            console.error(`Error copying ${sourcePath} to ${targetPath}:`, error);
            return false;
        }
    }

    private async copyDirectoryRecursive(sourceDir: string, targetDir: string): Promise<void> {
        if (!this.session.session) {
            return;
        }

        // Create target directory (by creating a file in it)
        const tempFile = path.join(targetDir, '.temp');
        await this.session.session.filesystem.write(tempFile, '');
        await this.session.session.filesystem.remove(tempFile);

        const files = await this.session.session.filesystem.list(sourceDir);
        
        for (const file of files) {
            const sourcePath = path.join(sourceDir, file.name);
            const targetPath = path.join(targetDir, file.name);
            
            if (file.isDir) {
                await this.copyDirectoryRecursive(sourcePath, targetPath);
            } else {
                const content = await this.session.session.filesystem.read(sourcePath);
                await this.session.session.filesystem.write(targetPath, content);
            }
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
        this.fileWatcher.dispose();
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
