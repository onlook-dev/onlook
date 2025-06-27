import type { WatchEvent } from '@codesandbox/sdk';
import { EXCLUDED_SYNC_DIRECTORIES, JSX_FILE_EXTENSIONS } from '@onlook/constants';
import { type TemplateNode } from '@onlook/models';
import { getContentFromTemplateNode } from '@onlook/parser';
import { getBaseName, getDirName, isImageFile, isSubdirectory, LogTimer } from '@onlook/utility';
import localforage from 'localforage';
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
    private fileWatcher: FileWatcher | null = null;
    private fileSync: FileSyncManager = new FileSyncManager();
    private templateNodeMap: TemplateNodeMapper = new TemplateNodeMapper(localforage);
    readonly fileEventBus: FileEventBus = new FileEventBus();
    private isIndexed = false;
    private isIndexing = false;

    constructor(private readonly editorEngine: EditorEngine) {
        this.session = new SessionManager(this.editorEngine);
        makeAutoObservable(this);

        reaction(
            () => this.session.session,
            (session) => {
                this.isIndexed = false;
                if (session) {
                    this.index();
                } else {
                    this.fileSync.clear();
                }
            },
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

            // Categorize files for optimized processing
            const { imageFiles, jsxFiles, otherFiles } =
                this.categorizeFilesForIndexing(allFilePaths);

            const BATCH_SIZE = 50;

            // Track image files first
            if (imageFiles.length > 0) {
                timer.log(`Tracking ${imageFiles.length} image files`);
                for (let i = 0; i < imageFiles.length; i += BATCH_SIZE) {
                    const batch = imageFiles.slice(i, i + BATCH_SIZE);
                    await this.fileSync.trackBinaryFilesBatch(batch);
                }
            }

            // Process JSX files
            if (jsxFiles.length > 0) {
                timer.log(`Processing ${jsxFiles.length} JSX files in batches of ${BATCH_SIZE}`);
                for (let i = 0; i < jsxFiles.length; i += BATCH_SIZE) {
                    const batch = jsxFiles.slice(i, i + BATCH_SIZE);
                    await this.processJsxFilesBatch(batch);
                }
            }

            // Process other files
            if (otherFiles.length > 0) {
                timer.log(
                    `Processing ${otherFiles.length} other files in batches of ${BATCH_SIZE}`,
                );
                for (let i = 0; i < otherFiles.length; i += BATCH_SIZE) {
                    const batch = otherFiles.slice(i, i + BATCH_SIZE);
                    await this.processTextFilesBatch(batch);
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

    /**
     * Optimized flat file discovery - similar to hosting manager approach
     */
    private async getAllFilePathsFlat(rootDir: string, excludeDirs: string[]): Promise<string[]> {
        if (!this.session.session) {
            throw new Error('No session available for file discovery');
        }

        const allPaths: string[] = [];
        const dirsToProcess = [rootDir];

        while (dirsToProcess.length > 0) {
            const currentDir = dirsToProcess.shift()!;
            try {
                const entries = await this.session.session.fs.readdir(currentDir);

                for (const entry of entries) {
                    const fullPath = `${currentDir}/${entry.name}`;
                    const normalizedPath = normalizePath(fullPath);

                    if (entry.type === 'directory') {
                        // Skip excluded directories
                        if (!excludeDirs.includes(entry.name)) {
                            dirsToProcess.push(normalizedPath);
                        }
                    } else if (entry.type === 'file') {
                        allPaths.push(normalizedPath);
                    }
                }
            } catch (error) {
                console.warn(`Error reading directory ${currentDir}:`, error);
            }
        }

        return allPaths;
    }

    /**
     * Categorize files for optimized processing
     */
    private categorizeFilesForIndexing(filePaths: string[]): {
        imageFiles: string[];
        jsxFiles: string[];
        otherFiles: string[];
    } {
        const imageFiles: string[] = [];
        const jsxFiles: string[] = [];
        const otherFiles: string[] = [];

        for (const filePath of filePaths) {
            const normalizedPath = normalizePath(filePath);

            if (isImageFile(normalizedPath)) {
                imageFiles.push(normalizedPath);
            } else {
                const extension = path.extname(filePath);
                if (JSX_FILE_EXTENSIONS.includes(extension)) {
                    jsxFiles.push(normalizedPath);
                } else {
                    otherFiles.push(normalizedPath);
                }
            }
        }

        return { imageFiles, jsxFiles, otherFiles };
    }

    private async processJsxFilesBatch(filePaths: string[]): Promise<void> {
        const fileContents = await this.fileSync.readOrFetchBatch(
            filePaths,
            this.readRemoteFile.bind(this),
        );

        const mappingPromises = Object.keys(fileContents).map(async (filePath) => {
            try {
                await this.processFileForMapping(filePath);
            } catch (error) {
                console.warn(`Error processing mapping for JSX file ${filePath}:`, error);
            }
        });

        await Promise.all(mappingPromises);
    }

    /**
     * Process text files in parallel batches
     */
    private async processTextFilesBatch(filePaths: string[]): Promise<void> {
        await this.fileSync.readOrFetchBatch(filePaths, this.readRemoteFile.bind(this));
    }

    private async readRemoteFile(filePath: string): Promise<string | null> {
        if (!this.session.session) {
            console.error('No session found for remote read');
            return null;
        }

        try {
            return await this.session.session.fs.readTextFile(filePath);
        } catch (error) {
            console.error(`Error reading remote file ${filePath}:`, error);
            return null;
        }
    }

    private async readRemoteBinaryFile(filePath: string): Promise<Uint8Array | null> {
        if (!this.session.session) {
            console.error('No session found for remote binary read');
            return null;
        }

        try {
            return await this.session.session.fs.readFile(filePath);
        } catch (error) {
            console.error(`Error reading remote binary file ${filePath}:`, error);
            return null;
        }
    }

    private async writeRemoteFile(filePath: string, fileContent: string): Promise<boolean> {
        if (!this.session.session) {
            console.error('No session found for remote write');
            return false;
        }

        try {
            await this.processFileForMapping(filePath);
            await this.session.session.fs.writeTextFile(filePath, fileContent);
            return true;
        } catch (error) {
            console.error(`Error writing remote file ${filePath}:`, error);
            return false;
        }
    }

    private async writeRemoteBinaryFile(
        filePath: string,
        fileContent: Buffer | Uint8Array,
    ): Promise<boolean> {
        if (!this.session.session) {
            console.error('No session found for remote binary write');
            return false;
        }

        try {
            await this.session.session.fs.writeFile(filePath, fileContent);
            return true;
        } catch (error) {
            console.error(`Error writing remote binary file ${filePath}:`, error);
            return false;
        }
    }

    async readFile(path: string): Promise<string | null> {
        const normalizedPath = normalizePath(path);
        return this.fileSync.readOrFetch(normalizedPath, this.readRemoteFile.bind(this));
    }

    async readFiles(paths: string[]): Promise<Record<string, string>> {
        const results: Record<string, string> = {};
        for (const path of paths) {
            const content = await this.readFile(path);
            if (!content) {
                console.error(`Failed to read file ${path}`);
                continue;
            }
            results[path] = content;
        }
        return results;
    }
    async readBinaryFile(path: string): Promise<Uint8Array | null> {
        const normalizedPath = normalizePath(path);
        try {
            return this.fileSync.readOrFetchBinaryFile(
                normalizedPath,
                this.readRemoteBinaryFile.bind(this),
            );
        } catch (error) {
            console.error(`Error reading binary file ${normalizedPath}:`, error);
            return null;
        }
    }

    async writeFile(path: string, content: string): Promise<boolean> {
        const normalizedPath = normalizePath(path);
        const formattedContent = await formatContent(normalizedPath, content);
        return this.fileSync.write(
            normalizedPath,
            formattedContent,
            this.writeRemoteFile.bind(this),
        );
    }

    listAllFiles() {
        return this.fileSync.listAllFiles();
    }

    async updateFileCache(filePath: string, content: string): Promise<void> {
        await this.fileSync.updateCache(filePath, content);
    }

    async listFiles(dir: string) {
        return this.session.session?.fs.readdir(dir);
    }

    listBinaryFiles(dir: string) {
        return this.fileSync.listBinaryFiles(dir);
    }

    async writeBinaryFile(path: string, content: Buffer | Uint8Array): Promise<boolean> {
        const normalizedPath = normalizePath(path);

        try {
            return this.fileSync.writeBinary(
                normalizedPath,
                content,
                this.writeRemoteBinaryFile.bind(this),
            );
        } catch (error) {
            console.error(`Error writing binary file ${normalizedPath}:`, error);
            return false;
        }
    }

    async listFilesRecursively(
        dir: string,
        ignoreDirs: string[] = [],
        ignoreExtensions: string[] = [],
    ): Promise<string[]> {
        if (!this.session.session) {
            console.error('No session found');
            return [];
        }

        const results: string[] = [];
        const entries = await this.session.session.fs.readdir(dir);

        for (const entry of entries) {
            const fullPath = `${dir}/${entry.name}`;
            const normalizedPath = normalizePath(fullPath);
            if (entry.type === 'directory') {
                if (ignoreDirs.includes(entry.name)) {
                    continue;
                }
                const subFiles = await this.listFilesRecursively(
                    normalizedPath,
                    ignoreDirs,
                    ignoreExtensions,
                );
                results.push(...subFiles);
            } else {
                const extension = path.extname(entry.name);
                if (ignoreExtensions.length > 0 && !ignoreExtensions.includes(extension)) {
                    continue;
                }
                results.push(normalizedPath);
            }
        }
        return results;
    }

    // Download the code as a zip
    async downloadFiles(
        projectName?: string,
    ): Promise<{ downloadUrl: string; fileName: string } | null> {
        if (!this.session.session) {
            console.error('No sandbox session found');
            return null;
        }
        try {
            const { downloadUrl } = await this.session.session.fs.download('./');
            return {
                downloadUrl,
                fileName: `${projectName || 'onlook-project'}-${Date.now()}.zip`,
            };
        } catch (error) {
            console.error('Error generating download URL:', error);
            return null;
        }
    }

    async watchFiles() {
        if (!this.session.session) {
            console.error('No session found');
            return;
        }

        // Dispose of existing watcher if it exists
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = null;
        }

        // Convert ignored directories to glob patterns with ** wildcard
        const excludePatterns = EXCLUDED_SYNC_DIRECTORIES.map((dir) => `${dir}/**`);

        this.fileWatcher = new FileWatcher({
            session: this.session.session,
            onFileChange: async (event) => {
                await this.handleFileChange(event);
            },
            excludePatterns,
            fileEventBus: this.fileEventBus,
        });

        await this.fileWatcher.start();
    }

    async handleFileChange(event: WatchEvent) {
        const eventType = event.type;

        if (eventType === 'remove') {
            for (const path of event.paths) {
                if (isSubdirectory(path, EXCLUDED_SYNC_DIRECTORIES)) {
                    continue;
                }
                const normalizedPath = normalizePath(path);
                await this.fileSync.delete(normalizedPath);

                this.fileEventBus.publish({
                    type: eventType,
                    paths: [normalizedPath],
                    timestamp: Date.now(),
                });
            }
        } else if (eventType === 'change' || eventType === 'add') {
            if (event.paths.length === 2) {
                // This mean rename a file or a folder, move a file or a folder
                const [oldPath, newPath] = event.paths;

                if (!oldPath || !newPath) {
                    console.error('Invalid rename event', event);
                    return;
                }
                const oldNormalizedPath = normalizePath(oldPath);
                const newNormalizedPath = normalizePath(newPath);
                await this.fileSync.rename(oldNormalizedPath, newNormalizedPath);

                this.fileEventBus.publish({
                    type: 'rename',
                    paths: [oldPath, newPath],
                    timestamp: Date.now(),
                });
                return;
            }
            for (const path of event.paths) {
                if (isSubdirectory(path, EXCLUDED_SYNC_DIRECTORIES)) {
                    continue;
                }
                const normalizedPath = normalizePath(path);

                if (isImageFile(normalizedPath)) {
                    await this.fileSync.trackBinaryFile(normalizedPath);
                } else {
                    const content = await this.readRemoteFile(normalizedPath);
                    if (content === null) {
                        console.error(`File content for ${normalizedPath} not found`);
                        continue;
                    }
                    const contentChanged = await this.fileSync.syncFromRemote(
                        normalizedPath,
                        content,
                    );
                    if (contentChanged) {
                        await this.processFileForMapping(normalizedPath);
                    }
                }

                this.fileEventBus.publish({
                    type: eventType,
                    paths: [normalizedPath],
                    timestamp: Date.now(),
                });
            }
        }
    }

    async processFileForMapping(file: string) {
        const extension = path.extname(file);
        if (!extension || !JSX_FILE_EXTENSIONS.includes(extension)) {
            return;
        }

        const normalizedPath = normalizePath(file);
        await this.templateNodeMap.processFileForMapping(
            normalizedPath,
            this.readFile.bind(this),
            this.writeFile.bind(this),
        );
    }

    async getTemplateNode(oid: string): Promise<TemplateNode | null> {
        return this.templateNodeMap.getTemplateNode(oid);
    }

    async getCodeBlock(oid: string): Promise<string | null> {
        const templateNode = this.templateNodeMap.getTemplateNode(oid);
        if (!templateNode) {
            console.error(`No template node found for oid ${oid}`);
            return null;
        }

        const content = await this.readFile(templateNode.path);
        if (!content) {
            console.error(`No file found for template node ${oid}`);
            return null;
        }

        const codeBlock = await getContentFromTemplateNode(templateNode, content);
        return codeBlock;
    }

    async fileExists(path: string): Promise<boolean> {
        const normalizedPath = normalizePath(path);

        if (!this.session.session) {
            console.error('No session found for file existence check');
            return false;
        }

        try {
            const dirPath = getDirName(normalizedPath);
            const fileName = getBaseName(normalizedPath);
            const dirEntries = await this.session.session.fs.readdir(dirPath);
            return dirEntries.some((entry: any) => entry.name === fileName);
        } catch (error) {
            console.error(`Error checking file existence ${normalizedPath}:`, error);
            return false;
        }
    }

    async copy(
        path: string,
        targetPath: string,
        recursive?: boolean,
        overwrite?: boolean,
    ): Promise<boolean> {
        if (!this.session.session) {
            console.error('No session found for copy');
            return false;
        }

        try {
            const normalizedSourcePath = normalizePath(path);
            const normalizedTargetPath = normalizePath(targetPath);

            // Check if source exists
            const sourceExists = await this.fileExists(normalizedSourcePath);
            if (!sourceExists) {
                console.error(`Source ${normalizedSourcePath} does not exist`);
                return false;
            }

            await this.session.session.fs.copy(
                normalizedSourcePath,
                normalizedTargetPath,
                recursive,
                overwrite,
            );

            return true;
        } catch (error) {
            console.error(`Error copying ${path} to ${targetPath}:`, error);
            return false;
        }
    }

    async delete(path: string, recursive?: boolean): Promise<boolean> {
        if (!this.session.session) {
            console.error('No session found for delete file');
            return false;
        }

        try {
            const normalizedPath = normalizePath(path);

            // Check if file exists before attempting to delete
            const exists = await this.fileExists(normalizedPath);
            if (!exists) {
                console.error(`File ${normalizedPath} does not exist`);
                return false;
            }

            // Delete the file using the filesystem API
            await this.session.session.fs.remove(normalizedPath, recursive);

            // Clean up the file sync cache
            await this.fileSync.delete(normalizedPath);

            // Publish file deletion event
            this.fileEventBus.publish({
                type: 'remove',
                paths: [normalizedPath],
                timestamp: Date.now(),
            });

            console.log(`Successfully deleted file: ${normalizedPath}`);
            return true;
        } catch (error) {
            console.error(`Error deleting file ${path}:`, error);
            return false;
        }
    }

    async rename(oldPath: string, newPath: string): Promise<boolean> {
        if (!this.session.session) {
            console.error('No session found for rename');
            return false;
        }

        try {
            const normalizedOldPath = normalizePath(oldPath);
            const normalizedNewPath = normalizePath(newPath);

            await this.session.session.fs.rename(normalizedOldPath, normalizedNewPath);

            return true;
        } catch (error) {
            console.error(`Error renaming file ${oldPath} to ${newPath}:`, error);
            return false;
        }
    }

    get isIndexingFiles() {
        return this.isIndexing;
    }

    clear() {
        this.fileWatcher?.dispose();
        this.fileWatcher = null;
        this.fileSync.clear();
        this.templateNodeMap.clear();
        this.session.disconnect();
        this.isIndexed = false;
        this.isIndexing = false;
    }
}
