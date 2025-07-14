import type { SandboxDirectory, SandboxFile } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { normalizePath } from './helpers';

export class FileSyncManager {
    private cache: Map<string, SandboxFile>;
    private directoryCache: Map<string, SandboxDirectory>;

    constructor() {
        this.cache = new Map();
        this.directoryCache = new Map();
        makeAutoObservable(this);
    }

    has(filePath: string) {
        return this.cache.has(filePath);
    }

    hasDirectory(dirPath: string) {
        return this.directoryCache.has(dirPath);
    }

    async isFileLoaded(file: SandboxFile) {
        return file && file.content !== null;
    }

    readCache(filePath: string) {
        return this.cache.get(filePath);
    }

    async readOrFetch(
        filePath: string,
        readFile: (path: string) => Promise<SandboxFile | null>,
    ): Promise<SandboxFile | null> {
        const cachedFile = this.cache.get(filePath);
        if (cachedFile && cachedFile.content !== null) {
            return cachedFile;
        }
        const newFile = await readFile(filePath);
        if (!newFile) {
            return null;
        }
        this.updateCache(newFile);
        return newFile;
    }

    async write(
        filePath: string,
        content: string | Uint8Array,
        writeFile: (path: string, content: string | Uint8Array) => Promise<boolean>,
    ) {
        try {
            const newFile = this.getFileFromContent(filePath, content);
            this.updateCache(newFile);
            return await writeFile(filePath, content);
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    updateCache(file: SandboxFile): void {
        this.cache.set(file.path, file);
    }

    updateDirectoryCache(dirPath: string, files: SandboxFile[]): void {
        this.directoryCache.set(dirPath, {
            type: 'directory',
            path: dirPath,
            files
        });
    }

    deleteDir(dirPath: string) {
        this.directoryCache.delete(dirPath);
        this.cache.forEach((file, path) => {
            if (path.startsWith(dirPath + '/')) {
                this.cache.delete(path);
            }
        });
    }

    async delete(path: string) {
        this.cache.delete(path);
    }

    async rename(oldPath: string, newPath: string) {        
        const normalizedOldPath = normalizePath(oldPath);
        const normalizedNewPath = normalizePath(newPath);
        const oldFile = this.cache.get(normalizedOldPath);
        if (oldFile) {
            this.cache.set(normalizedNewPath, oldFile);
            this.cache.delete(normalizedOldPath);
        }
    }

    async renameDir(oldPath: string, newPath: string) {
        const normalizedOldPath = normalizePath(oldPath);
        const normalizedNewPath = normalizePath(newPath);
        
        // Get all files that are within the old folder path
        const filesToRename = Array.from(this.cache.entries())
            .filter(([filePath]) => filePath.startsWith(normalizedOldPath + '/'))
            .map(([filePath, file]) => ({ oldFilePath: filePath, file }));
        
        // Rename each file by updating its path in the cache
        for (const { oldFilePath, file } of filesToRename) {
            // Calculate the new file path by replacing the old folder path with the new one
            const relativePath = oldFilePath.substring(normalizedOldPath.length);
            const newFilePath = normalizedNewPath + relativePath;
            
            // Update the file's path and move it in the cache
            const updatedFile = { ...file, path: newFilePath };
            this.cache.set(newFilePath, updatedFile);
            this.cache.delete(oldFilePath);
        }
        // Update the directory cache
        this.directoryCache.set(normalizedNewPath, {
            type: 'directory',
            path: normalizedNewPath,
            files: filesToRename.map(({ file }) => file)
        });

        this.directoryCache.delete(normalizedOldPath);
    }

    listAllFiles() {
        return Array.from(this.cache.keys());
    }

    listAllDirectories() {
        return Array.from(this.directoryCache.keys());
    }

    writeEmptyFile(filePath: string, type: 'binary') {
        if (this.has(filePath)) {
            return;
        }

        this.updateCache({
            type,
            path: filePath,
            content: null
        });
    }

    getFileFromContent(filePath: string, content: string | Uint8Array) {
        const type = content instanceof Uint8Array ? 'binary' : 'text';
        const newFile: SandboxFile = type === 'binary' ? {
            type,
            path: filePath,
            content: content as Uint8Array
        } : {
            type,
            path: filePath,
            content: content as string
        };
        return newFile;
    }

    /**
     * Batch read multiple files in parallel
     */
    async readOrFetchBatch(
        filePaths: string[],
        readFile: (path: string) => Promise<SandboxFile | null>,
    ): Promise<Record<string, SandboxFile>> {
        const results = new Map<string, SandboxFile>();
        const promises = filePaths.map(async (filePath) => {
            try {
                const content = await this.readOrFetch(filePath, readFile);
                if (content !== null) {
                    return { path: filePath, content };
                }
            } catch (error) {
                console.warn(`Error reading file ${filePath}:`, error);
            }
            return null;
        });

        const batchResults = await Promise.all(promises);

        for (const result of batchResults) {
            if (result) {
                results.set(result.path, result.content);
            }
        }
        return Object.fromEntries(results);
    }

    /**
     * Batch update cache entries
     */
    async updateCacheBatch(entries: Array<SandboxFile>): Promise<void> {
        for (const entry of entries) {
            this.cache.set(entry.path, entry);
        }
    }

    /**
     * Track multiple binary files at once
     */
    writeEmptyFilesBatch(filePaths: string[], type: 'binary'): void {
        for (const filePath of filePaths) {
            this.writeEmptyFile(filePath, type);
        }
    }

    async clear() {
        this.cache.clear();
        this.cache = new Map();
    }
}