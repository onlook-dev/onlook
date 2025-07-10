import type { SandboxFile } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { normalizePath } from './helpers';

export class FileSyncManager {
    private cache: Map<string, SandboxFile>;

    constructor() {
        this.cache = new Map();
        makeAutoObservable(this);
    }

    has(filePath: string) {
        return this.cache.has(filePath);
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
        await this.updateCache(newFile);
        return newFile;
    }

    async write(
        filePath: string,
        content: string | Uint8Array,
        writeFile: (path: string, content: string | Uint8Array) => Promise<boolean>,
    ) {
        try {
            const newFile = this.getFileFromContent(filePath, content);
            await this.updateCache(newFile);
            return await writeFile(filePath, content);
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    async updateCache(file: SandboxFile): Promise<void> {
        this.cache.set(file.path, file);
    }

    async delete(filePath: string) {
        this.cache.delete(filePath);
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

    listAllFiles() {
        return Array.from(this.cache.keys());
    }

    async writeEmptyFile(filePath: string, type: 'binary') {
        if (this.has(filePath)) {
            return;
        }

        await this.updateCache({
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
    async writeEmptyFilesBatch(filePaths: string[], type: 'binary'): Promise<void> {
        for (const filePath of filePaths) {
            await this.writeEmptyFile(filePath, type);
        }
    }

    async clear() {
        this.cache.clear();
        this.cache = new Map();
    }
}