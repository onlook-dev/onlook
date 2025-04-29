import localforage from 'localforage';

export class FileSyncManager {
    private cache: Map<string, string>;
    private storageKey = 'file-sync-cache';

    constructor() {
        this.cache = new Map();
        this.restoreFromLocalStorage();
    }

    has(filePath: string) {
        return this.cache.has(filePath);
    }

    async readOrFetch(filePath: string, readFile: (path: string) => Promise<string | null>): Promise<string | null> {
        if (this.has(filePath)) {
            return this.cache.get(filePath) || null;
        }

        try {
            const content = await readFile(filePath);
            if (content) {
                this.cache.set(filePath, content);
                await this.saveToLocalStorage();
            }
            return content;
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return null;
        }
    }

    async write(filePath: string, content: string, writeFile: (path: string, content: string) => Promise<boolean>): Promise<boolean> {
        try {
            const success = await writeFile(filePath, content);
            if (success) {
                this.cache.set(filePath, content);
                await this.saveToLocalStorage();
            }
            return success;
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    async updateCache(filePath: string, content: string): Promise<void> {
        this.cache.set(filePath, content);
        await this.saveToLocalStorage();
    }

    async delete(filePath: string) {
        this.cache.delete(filePath);
        await this.saveToLocalStorage();
    }

    listFiles() {
        return Array.from(this.cache.keys());
    }

    private async restoreFromLocalStorage() {
        try {
            const storedCache = await localforage.getItem<Record<string, string>>(this.storageKey);
            if (storedCache) {
                Object.entries(storedCache).forEach(([key, value]) => {
                    this.cache.set(key, value);
                });
            }
        } catch (error) {
            console.error('Error restoring from localForage:', error);
        }
    }

    private async saveToLocalStorage() {
        try {
            const cacheObject = Object.fromEntries(this.cache.entries());
            await localforage.setItem(this.storageKey, cacheObject);
        } catch (error) {
            console.error('Error saving to localForage:', error);
        }
    }

    private async clearLocalStorage() {
        try {
            await localforage.removeItem(this.storageKey);
        } catch (error) {
            console.error('Error clearing localForage:', error);
        }
    }

    async clear() {
        this.cache.clear();
        this.cache = new Map();
        await this.clearLocalStorage();
    }
}
