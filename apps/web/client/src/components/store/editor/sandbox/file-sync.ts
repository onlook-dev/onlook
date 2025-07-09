import { makeAutoObservable } from 'mobx';

export class FileSyncManager {
    private cache: Map<string, string>;
    private binaryCache: Map<string, Uint8Array>;

    constructor() {
        this.cache = new Map();
        this.binaryCache = new Map();
        makeAutoObservable(this);
    }

    has(filePath: string) {
        return this.cache.has(filePath);
    }

    hasBinary(filePath: string) {
        return this.binaryCache.has(filePath);
    }

    // Track binary file path without reading content (using empty placeholder)
    async trackBinaryFile(filePath: string) {
        if (!this.hasBinary(filePath)) {
            this.binaryCache.set(filePath, new Uint8Array(0));
        }
    }

    // Check if binary file has actual content loaded
    hasBinaryContent(filePath: string) {
        const content = this.binaryCache.get(filePath);
        return content && content.length > 0;
    }

    async readOrFetchBinaryFile(
        filePath: string,
        readFile: (path: string) => Promise<Uint8Array | null>,
    ): Promise<Uint8Array | null> {
        if (this.hasBinary(filePath)) {
            const cachedContent = this.binaryCache.get(filePath);
            // If content is empty (placeholder), fetch the actual content
            if (cachedContent && cachedContent.length === 0) {
                try {
                    const content = await readFile(filePath);
                    if (content === null) {
                        throw new Error(`File content for ${filePath} not found`);
                    }
                    this.updateBinaryCache(filePath, content);
                    return content;
                } catch (error) {
                    console.error(`Error reading binary file ${filePath}:`, error);
                    return null;
                }
            }
            return cachedContent ?? null;
        }

        try {
            const content = await readFile(filePath);
            if (content === null) {
                throw new Error(`File content for ${filePath} not found`);
            }

            this.updateBinaryCache(filePath, content);
            return content;
        } catch (error) {
            console.error(`Error reading binary file ${filePath}:`, error);
            return null;
        }
    }

    async readOrFetch(
        filePath: string,
        readFile: (path: string) => Promise<string | null>,
    ): Promise<string | null> {
        if (this.has(filePath)) {
            return this.cache.get(filePath) ?? null;
        }

        try {
            const content = await readFile(filePath);
            if (content === null) {
                throw new Error(`File content for ${filePath} not found`);
            }
            this.updateCache(filePath, content);
            return content;
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return null;
        }
    }

    async write(
        filePath: string,
        content: string,
        writeFile: (path: string, content: string) => Promise<boolean>,
    ): Promise<boolean> {
        try {
            // Write to cache first
            this.updateCache(filePath, content);

            // Then write to remote
            const success = await writeFile(filePath, content);
            if (!success) {
                throw new Error(`Failed to write file ${filePath}`);
            }
            return success;
        } catch (error) {
            // If any error occurs, remove from cache
            this.delete(filePath);
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    async writeBinary(
        filePath: string,
        content: Uint8Array,
        writeFile: (path: string, content: Uint8Array) => Promise<boolean>,
    ): Promise<boolean> {
        try {
            // Write to cache first

            this.updateBinaryCache(filePath, content);

            // Then write to remote
            const success = await writeFile(filePath, content);

            if (!success) {
                throw new Error(`Failed to write file ${filePath}`);
            }
            return success;
        } catch (error) {
            // If any error occurs, remove from cache
            this.delete(filePath);
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    async updateBinaryCache(filePath: string, content: Uint8Array): Promise<void> {
        this.binaryCache.set(filePath, content);
    }

    async updateCache(filePath: string, content: string): Promise<void> {
        this.cache.set(filePath, content);
    }

    async delete(filePath: string) {
        this.binaryCache.delete(filePath);
        this.cache.delete(filePath);
    }

    async rename(oldPath: string, newPath: string) {
        let hasChanges = false;

        // Handle folder renaming - find all files that start with oldPath
        const normalizedOldPath = oldPath.endsWith('/') ? oldPath : oldPath + '/';
        const normalizedNewPath = newPath.endsWith('/') ? newPath : newPath + '/';

        // Update binary cache entries
        const binaryEntriesToUpdate: Array<{ oldKey: string; newKey: string; content: Uint8Array }> = [];
        for (const [filePath, content] of this.binaryCache.entries()) {
            if (filePath === oldPath) {
                binaryEntriesToUpdate.push({ oldKey: filePath, newKey: newPath, content });
                hasChanges = true;
            } else if (filePath.startsWith(normalizedOldPath)) {
                const relativePath = filePath.substring(normalizedOldPath.length);
                const newFilePath = normalizedNewPath + relativePath;
                binaryEntriesToUpdate.push({ oldKey: filePath, newKey: newFilePath, content });
                hasChanges = true;
            }
        }

        for (const { oldKey, newKey, content } of binaryEntriesToUpdate) {
            this.binaryCache.set(newKey, content);
            this.binaryCache.delete(oldKey);
        }

        // Update text cache entries
        const textEntriesToUpdate: Array<{ oldKey: string; newKey: string; content: string }> = [];
        for (const [filePath, content] of this.cache.entries()) {
            if (filePath === oldPath) {
                textEntriesToUpdate.push({ oldKey: filePath, newKey: newPath, content });
                hasChanges = true;
            } else if (filePath.startsWith(normalizedOldPath)) {
                const relativePath = filePath.substring(normalizedOldPath.length);
                const newFilePath = normalizedNewPath + relativePath;
                textEntriesToUpdate.push({ oldKey: filePath, newKey: newFilePath, content });
                hasChanges = true;
            }
        }

        // Apply text cache updates
        for (const { oldKey, newKey, content } of textEntriesToUpdate) {
            this.cache.set(newKey, content);
            this.cache.delete(oldKey);
        }
    }

    listAllFiles() {
        return [
            ...Array.from(this.cache.keys()),
            ...Array.from(this.binaryCache.keys()),
        ];
    }

    listBinaryFiles(dir: string) {
        return Array.from(this.binaryCache.keys()).filter(filePath => filePath.startsWith(dir));
    }

    async syncFromRemote(
        filePath: string,
        remoteContent: string,
    ): Promise<boolean> {
        const cachedContent = this.cache.get(filePath);
        const contentChanged = cachedContent !== remoteContent;
        if (contentChanged) {
            // Only update cache if content is different
            await this.updateCache(filePath, remoteContent);
        }
        return contentChanged;
    }

    async clear() {
        this.cache.clear();
        this.binaryCache.clear();
        this.cache = new Map();
        this.binaryCache = new Map();
    }

    /**
     * Batch read multiple files in parallel
     */
    async readOrFetchBatch(
        filePaths: string[],
        readFile: (path: string) => Promise<string | null>,
    ): Promise<Record<string, string>> {
        const results: Record<string, string> = {};

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
                results[result.path] = result.content;
            }
        }
        return results;
    }

    /**
     * Batch update cache entries
     */
    async updateCacheBatch(entries: Array<{ path: string; content: string }>): Promise<void> {
        for (const { path, content } of entries) {
            this.cache.set(path, content);
        }
    }

    /**
     * Batch update binary cache entries
     */
    async updateBinaryCacheBatch(entries: Array<{ path: string; content: Uint8Array }>): Promise<void> {
        for (const { path, content } of entries) {
            this.binaryCache.set(path, content);
        }
    }

    /**
     * Track multiple binary files at once
     */
    async trackBinaryFilesBatch(filePaths: string[]): Promise<void> {
        let hasChanges = false;

        for (const filePath of filePaths) {
            if (!this.hasBinary(filePath)) {
                this.binaryCache.set(filePath, new Uint8Array(0));
                hasChanges = true;
            }
        }

    }
}