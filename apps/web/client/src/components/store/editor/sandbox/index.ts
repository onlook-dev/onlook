import type {
    ListFilesOutputFile,
    Provider,
    ProviderFileWatcher,
    WatchEvent,
} from '@onlook/code-provider';
import {
    EXCLUDED_SYNC_DIRECTORIES,
    NEXT_JS_FILE_EXTENSIONS,
    PRELOAD_SCRIPT_SRC,
} from '@onlook/constants';
import { RouterType, type SandboxFile, type TemplateNode } from '@onlook/models';
import { getContentFromTemplateNode, getTemplateNodeChild } from '@onlook/parser';
import {
    getBaseName,
    getDirName,
    isImageFile,
    isRootLayoutFile,
    isSubdirectory,
    LogTimer,
} from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
import path from 'path';
import { env } from 'process';
import type { EditorEngine } from '../engine';
import { detectRouterTypeInSandbox } from '../pages/helper';
import { FileEventBus } from './file-event-bus';
import { FileSyncManager } from './file-sync';
import { normalizePath } from './helpers';
import { TemplateNodeMapper } from './mapping';
import { SessionManager } from './session';

const isDev = env.NODE_ENV === 'development';

export class SandboxManager {
    readonly session: SessionManager;
    readonly fileEventBus: FileEventBus = new FileEventBus();

    // Add router configuration
    private _routerConfig: { type: RouterType; basePath: string } | null = null;

    private fileWatcher: ProviderFileWatcher | null = null;
    private fileSync: FileSyncManager;
    private templateNodeMap: TemplateNodeMapper;
    private _isIndexed = false;
    private _isIndexing = false;

    constructor(private readonly editorEngine: EditorEngine) {
        this.session = new SessionManager(this.editorEngine);
        this.fileSync = new FileSyncManager();
        this.templateNodeMap = new TemplateNodeMapper();
        makeAutoObservable(this);

        reaction(
            () => this.session.provider,
            (provider) => {
                this._isIndexed = false;
                if (provider) {
                    this.index();
                }
            },
        );
    }

    get isIndexed() {
        return this._isIndexed;
    }

    get isIndexing() {
        return this._isIndexing;
    }

    get routerConfig(): { type: RouterType; basePath: string } | null {
        return this._routerConfig;
    }

    async index(force = false) {
        console.log('[SandboxManager] Starting indexing, force:', force);

        if (this._isIndexing || (this._isIndexed && !force)) {
            return;
        }

        if (!this.session.provider) {
            console.error('No provider found for indexing');
            return;
        }

        this._isIndexing = true;
        const timer = new LogTimer('Sandbox Indexing');

        try {
            // Detect router configuration first
            if (!this._routerConfig) {
                this._routerConfig = await detectRouterTypeInSandbox(this);
                if (this._routerConfig) {
                    timer.log(
                        `Router detected: ${this._routerConfig.type} at ${this._routerConfig.basePath}`,
                    );
                }
            }

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
            this._isIndexed = true;
            timer.log('Indexing completed successfully');
        } catch (error) {
            console.error('Error during indexing:', error);
            throw error;
        } finally {
            this._isIndexing = false;
        }
    }

    /**
     * Optimized flat file discovery - similar to hosting manager approach
     */
    private async getAllFilePathsFlat(rootDir: string, excludeDirs: string[]): Promise<string[]> {
        if (!this.session.provider) {
            throw new Error('No provider available for file discovery');
        }

        const allPaths: string[] = [];
        const dirsToProcess = [rootDir];

        while (dirsToProcess.length > 0) {
            const currentDir = dirsToProcess.shift()!;
            try {
                const { files } = await this.session.provider?.listFiles({
                    args: {
                        path: currentDir,
                    },
                });

                for (const entry of files) {
                    const fullPath = `${currentDir}/${entry.name}`;
                    const normalizedPath = normalizePath(fullPath);

                    if (entry.type === 'directory') {
                        // Skip excluded directories
                        if (!excludeDirs.includes(entry.name)) {
                            dirsToProcess.push(normalizedPath);
                        }
                        this.fileSync.updateDirectoryCache(normalizedPath);
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

    private async readRemoteFile(filePath: string): Promise<SandboxFile | null> {
        if (!this.session.provider) {
            console.error('No provider found for remote read');
            throw new Error('No provider found for remote read');
        }

        try {
            const { file } = await this.session.provider.readFile({
                args: {
                    path: filePath,
                },
            });
            return file;
        } catch (error) {
            console.error(`Error reading remote file ${filePath}:`, error);
            return null;
        }
    }

    private async writeRemoteFile(
        filePath: string,
        content: string | Uint8Array,
        overwrite = true,
    ): Promise<boolean> {
        if (!this.session.provider) {
            console.error('No provider found for remote write');
            return false;
        }

        try {
            const res = await this.session.provider.writeFile({
                args: {
                    path: filePath,
                    content,
                    overwrite,
                },
            });
            return res.success;
        } catch (error) {
            console.error(`Error writing remote file ${filePath}:`, error);
            return false;
        }
    }

    async readFile(path: string): Promise<SandboxFile | null> {
        const normalizedPath = normalizePath(path);
        return this.fileSync.readOrFetch(normalizedPath, this.readRemoteFile.bind(this));
    }

    async readFiles(paths: string[]): Promise<Record<string, SandboxFile>> {
        const results = new Map<string, SandboxFile>();
        for (const path of paths) {
            const file = await this.readFile(path);
            if (!file) {
                console.error(`Failed to read file ${path}`);
                continue;
            }
            results.set(path, file);
        }
        return Object.fromEntries(results);
    }

    async writeFile(path: string, content: string): Promise<boolean> {
        const normalizedPath = normalizePath(path);
        let writeContent = content;

        // If the file is a JSX file, we need to process it for mapping before writing
        if (this.isJsxFile(normalizedPath)) {
            try {
                const { newContent } = await this.templateNodeMap.processFileForMapping(
                    normalizedPath,
                    content,
                    this.routerConfig?.type,
                );
                writeContent = newContent;
            } catch (error) {
                console.error(`Error processing file ${normalizedPath}:`, error);
            }
        }
        const success = await this.fileSync.write(
            normalizedPath,
            writeContent,
            this.writeRemoteFile.bind(this),
        );

        if (!success) {
            return false;
        }

        this.editorEngine.screenshot.captureScreenshot();

        return true;
    }

    isJsxFile(filePath: string): boolean {
        const extension = path.extname(filePath);
        if (!extension || !NEXT_JS_FILE_EXTENSIONS.includes(extension)) {
            return false;
        }
        return true;
    }

    async writeBinaryFile(path: string, content: Buffer | Uint8Array): Promise<boolean> {
        const normalizedPath = normalizePath(path);
        try {
            return this.fileSync.write(normalizedPath, content, this.writeRemoteFile.bind(this));
        } catch (error) {
            console.error(`Error writing binary file ${normalizedPath}:`, error);
            return false;
        }
    }

    get files() {
        return this.fileSync.listAllFiles();
    }

    get directories() {
        return this.fileSync.listAllDirectories();
    }

    listAllFiles() {
        return this.fileSync.listAllFiles();
    }

    async readDir(dir: string): Promise<ListFilesOutputFile[]> {
        if (!this.session.provider) {
            console.error('No provider found for read dir');
            return Promise.resolve([]);
        }
        const { files } = await this.session.provider.listFiles({
            args: {
                path: dir,
            },
        });
        return files;
    }

    async listFilesRecursively(
        dir: string,
        ignoreDirs: string[] = [],
        ignoreExtensions: string[] = [],
    ): Promise<string[]> {
        if (!this.session.provider) {
            console.error('No provider found for list files recursively');
            return [];
        }

        const results: string[] = [];
        const { files } = await this.session.provider.listFiles({
            args: {
                path: dir,
            },
        });

        for (const entry of files) {
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
        if (!this.session.provider) {
            console.error('No sandbox provider found for download');
            return null;
        }
        try {
            const { url } = await this.session.provider.downloadFiles({
                args: {
                    path: './',
                },
            });
            return {
                // in case there is no URL provided then the code must be updated
                // to handle this case
                downloadUrl: url ?? '',
                fileName: `${projectName ?? 'onlook-project'}-${Date.now()}.zip`,
            };
        } catch (error) {
            console.error('Error generating download URL:', error);
            return null;
        }
    }

    async watchFiles() {
        if (!this.session.provider) {
            console.error('No provider found for watch files');
            return;
        }

        // Dispose of existing watcher if it exists
        if (this.fileWatcher) {
            // Stop previous watcher before starting a new one
            await this.fileWatcher.stop();
            this.fileWatcher = null;
        }

        // Convert ignored directories to glob patterns with ** wildcard
        const excludePatterns = EXCLUDED_SYNC_DIRECTORIES.map((dir) => `${dir}/**`);

        const res = await this.session.provider.watchFiles({
            args: {
                path: './',
                recursive: true,
                excludes: excludePatterns,
            },
            onFileChange: async (event) => {
                this.fileEventBus.publish({
                    type: event.type,
                    paths: event.paths,
                    timestamp: Date.now(),
                });
                await this.handleFileChange(event);
            },
        });

        this.fileWatcher = res.watcher;
    }

    async handleFileChange(event: WatchEvent) {
        const eventType = event.type;

        if (eventType === 'remove') {
            for (const path of event.paths) {
                if (isSubdirectory(path, EXCLUDED_SYNC_DIRECTORIES)) {
                    continue;
                }
                const normalizedPath = normalizePath(path);

                const isDirectory = this.fileSync.hasDirectory(normalizedPath);

                if (isDirectory) {
                    this.fileSync.deleteDir(normalizedPath);
                    this.fileEventBus.publish({
                        type: eventType,
                        paths: [normalizedPath],
                        timestamp: Date.now(),
                    });
                    continue;
                }

                await this.fileSync.delete(normalizedPath);

                this.fileEventBus.publish({
                    type: eventType,
                    paths: [normalizedPath],
                    timestamp: Date.now(),
                });
            }
            if (isDev && event.paths.some((path) => path.includes(PRELOAD_SCRIPT_SRC))) {
                await this.editorEngine.preloadScript.ensurePreloadScriptFile();
            }
        } else if (eventType === 'change' || eventType === 'add') {
            const provider = this.session.provider;
            if (!provider) {
                console.error('No provider found for handle file change');
                return;
            }

            if (event.paths.length === 2) {
                await this.handleFileRenameEvent(event, provider);
            }

            for (const path of event.paths) {
                if (isSubdirectory(path, EXCLUDED_SYNC_DIRECTORIES)) {
                    continue;
                }
                const stat = await provider.statFile({
                    args: {
                        path,
                    },
                });

                if (stat?.type === 'directory') {
                    const normalizedPath = normalizePath(path);
                    this.fileSync.updateDirectoryCache(normalizedPath);
                    continue;
                }

                const normalizedPath = normalizePath(path);
                await this.handleFileChangedEvent(normalizedPath);
                this.fileEventBus.publish({
                    type: eventType,
                    paths: [normalizedPath],
                    timestamp: Date.now(),
                });
            }
        }
    }

    async handleFileRenameEvent(event: WatchEvent, provider: Provider) {
        // This mean rename a file or a folder, move a file or a folder
        const [oldPath, newPath] = event.paths;

        if (!oldPath || !newPath) {
            console.error('Invalid rename event', event);
            return;
        }

        const oldNormalizedPath = normalizePath(oldPath);
        const newNormalizedPath = normalizePath(newPath);

        const stat = await provider.statFile({
            args: {
                path: newPath,
            },
        });

        if (stat.type === 'directory') {
            await this.fileSync.renameDir(oldNormalizedPath, newNormalizedPath);
        } else {
            await this.fileSync.rename(oldNormalizedPath, newNormalizedPath);
        }

        this.fileEventBus.publish({
            type: 'rename',
            paths: [oldPath, newPath],
            timestamp: Date.now(),
        });
        return;
    }

    async handleFileChangedEvent(normalizedPath: string) {
        const cachedFile = this.fileSync.readCache(normalizedPath);

        if (isImageFile(normalizedPath)) {
            if (!cachedFile || cachedFile.content === null) {
                // If the file was not cached, we need to write an empty file
                this.fileSync.writeEmptyFile(normalizedPath, 'binary');
            } else {
                // If the file was already cached, we need to read the remote file and update the cache
                const remoteFile = await this.readRemoteFile(normalizedPath);
                if (!remoteFile || remoteFile.content === null) {
                    console.error(`File content for ${normalizedPath} not found in remote`);
                    return;
                }
                this.fileSync.updateCache(remoteFile);
            }
        } else {
            // If the file is not an image, we need to read the remote file and update the cache
            const remoteFile = await this.readRemoteFile(normalizedPath);
            if (!remoteFile || remoteFile.content === null) {
                console.error(`File content for ${normalizedPath} not found in remote`);
                return;
            }
            if (remoteFile.type === 'text') {
                // If the file is a text file, we need to process it for mapping
                this.fileSync.updateCache({
                    type: 'text',
                    path: normalizedPath,
                    content: remoteFile.content,
                });
                if (remoteFile.content !== cachedFile?.content) {
                    await this.processFileForMapping(remoteFile);
                }
            } else {
                this.fileSync.updateCache({
                    type: 'binary',
                    path: normalizedPath,
                    content: remoteFile.content,
                });
            }
        }
    }

    async processFileForMapping(file: SandboxFile) {
        try {
            if (file.type === 'binary' || !this.isJsxFile(file.path)) {
                return;
            }

            // If this is a layout file, ensure the preload script file exists
            if (isRootLayoutFile(file.path, this.routerConfig?.type)) {
                try {
                    await this.editorEngine.preloadScript.ensurePreloadScriptFile();
                } catch (error) {
                    console.warn(
                        `[SandboxManager] Failed to ensure preload script file for layout ${file.path}:`,
                        error,
                    );
                    // Continue processing even if preload script file check fails
                }
            }

            const { modified, newContent } = await this.templateNodeMap.processFileForMapping(
                file.path,
                file.content,
                this.routerConfig?.type,
            );

            if (modified && file.content !== newContent) {
                await this.writeFile(file.path, newContent);
            }
        } catch (error) {
            console.error(`Error processing file ${file.path}:`, error);
        }
    }

    async getTemplateNode(oid: string): Promise<TemplateNode | null> {
        return this.templateNodeMap.getTemplateNode(oid);
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
        const templateNode = this.templateNodeMap.getTemplateNode(oid);
        if (!templateNode) {
            console.error(`No template node found for oid ${oid}`);
            return null;
        }

        const file = await this.readFile(templateNode.path);
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

    async fileExists(path: string): Promise<boolean> {
        const normalizedPath = normalizePath(path);

        if (!this.session.provider) {
            console.error('No provider found for file existence check');
            return false;
        }

        try {
            const dirPath = getDirName(normalizedPath);
            const fileName = getBaseName(normalizedPath);
            const { files } = await this.session.provider.listFiles({
                args: {
                    path: dirPath,
                },
            });
            return files.some((entry) => entry.name === fileName);
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
        if (!this.session.provider) {
            console.error('No provider found for copy');
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

            await this.session.provider.copyFiles({
                args: {
                    sourcePath: normalizedSourcePath,
                    targetPath: normalizedTargetPath,
                    recursive,
                    overwrite,
                },
            });

            return true;
        } catch (error) {
            console.error(`Error copying ${path} to ${targetPath}:`, error);
            return false;
        }
    }

    async delete(path: string, recursive?: boolean): Promise<boolean> {
        if (!this.session.provider) {
            console.error('No provider found for delete file');
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
            await this.session.provider.deleteFiles({
                args: {
                    path: normalizedPath,
                    recursive,
                },
            });

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
        if (!this.session.provider) {
            console.error('No provider found for rename');
            return false;
        }

        try {
            const normalizedOldPath = normalizePath(oldPath);
            const normalizedNewPath = normalizePath(newPath);

            await this.session.provider.renameFile({
                args: {
                    oldPath: normalizedOldPath,
                    newPath: normalizedNewPath,
                },
            });

            return true;
        } catch (error) {
            console.error(`Error renaming file ${oldPath} to ${newPath}:`, error);
            return false;
        }
    }

    /**
     * Gets the root layout path and router config
     */
    async getRootLayoutPath(): Promise<string | null> {
        const routerConfig = this.routerConfig;
        if (!routerConfig) {
            console.log('Could not detect Next.js router type');
            return null;
        }

        let layoutFileName: string;

        if (routerConfig.type === RouterType.PAGES) {
            layoutFileName = '_app';
        } else {
            layoutFileName = 'layout';
        }

        for (const extension of NEXT_JS_FILE_EXTENSIONS) {
            const layoutPath = path.join(routerConfig.basePath, `${layoutFileName}${extension}`);
            if (await this.fileExists(layoutPath)) {
                return normalizePath(layoutPath);
            }
        }

        console.log('Could not find layout file');
        return null;
    }

    clear() {
        void this.fileWatcher?.stop();
        this.fileWatcher = null;
        this.fileSync.clear();
        this.templateNodeMap.clear();
        this.session.clear();
        this._isIndexed = false;
        this._isIndexing = false;
        this._routerConfig = null;
    }
}
