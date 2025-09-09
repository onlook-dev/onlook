import type { SandboxFile } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { FileCacheManager } from '../cache/file-cache';
import { normalizePath } from './helpers';

export class FileSyncManager {
    private cacheManager: FileCacheManager;

    constructor() {
        this.cacheManager = new FileCacheManager();
        makeAutoObservable(this);
    }

    async init(): Promise<void> {
        await this.cacheManager.init();
    }

    has(filePath: string) {
        return this.cacheManager.hasFile(filePath);
    }

    hasDirectory(dirPath: string) {
        return this.cacheManager.hasDirectory(dirPath);
    }

    isFileLoaded(file: SandboxFile) {
        return file && file.content !== null;
    }

    readCache(filePath: string) {
        return this.cacheManager.getFile(filePath);
    }

    async readOrFetch(
        filePath: string,
        readFile: (path: string) => Promise<SandboxFile | null>,
    ): Promise<SandboxFile | null> {
        return await this.cacheManager.readOrFetch(filePath, readFile);
    }

    async write(
        filePath: string,
        content: string | Uint8Array,
        writeFile: (path: string, content: string | Uint8Array) => Promise<boolean>,
    ) {
        return await this.cacheManager.write(filePath, content, writeFile);
    }

    updateCache(file: SandboxFile): void {
        this.cacheManager.setFile(file);
    }

    updateDirectoryCache(dirPath: string): void {
        this.cacheManager.setDirectory({
            type: 'directory',
            path: dirPath,
        });
    }

    deleteDir(dirPath: string) {
        this.cacheManager.deleteDirectory(dirPath);
        // Iterate through cache keys to find files in the directory
        for (const path of this.cacheManager.listAllFiles()) {
            if (path.startsWith(dirPath + '/')) {
                this.cacheManager.deleteFile(path);
            }
        }
    }

    async delete(path: string) {
        this.cacheManager.deleteFile(path);
    }

    async rename(oldPath: string, newPath: string) {
        const normalizedOldPath = normalizePath(oldPath);
        const normalizedNewPath = normalizePath(newPath);
        this.cacheManager.rename(normalizedOldPath, normalizedNewPath);
    }

    async renameDir(oldPath: string, newPath: string) {
        const normalizedOldPath = normalizePath(oldPath);
        const normalizedNewPath = normalizePath(newPath);
        this.cacheManager.renameDirectory(normalizedOldPath, normalizedNewPath);
    }

    listAllFiles() {
        return this.cacheManager.listAllFiles();
    }

    listAllDirectories() {
        return this.cacheManager.listAllDirectories();
    }

    writeEmptyFile(filePath: string, type: 'binary') {
        this.cacheManager.writeEmptyFile(filePath, type);
    }

    async clear() {
        await this.cacheManager.clear();
    }
}