import type { SandboxFile } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { FileCacheManager } from '../cache/file-cache';
import { normalizePath } from './helpers';

export class FileSyncManager {
    private cacheManager: FileCacheManager;

    constructor(projectId: string, branchId: string) {
        this.cacheManager = new FileCacheManager(projectId, branchId);
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

    async readCache(filePath: string) {
        return await this.cacheManager.getFile(filePath);
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

    async updateCache(file: SandboxFile): Promise<void> {
        await this.cacheManager.setFile(file);
    }

    async updateDirectoryCache(dirPath: string): Promise<void> {
        await this.cacheManager.setDirectory({
            type: 'directory',
            path: dirPath,
        });
    }

    async deleteDir(dirPath: string) {
        await this.cacheManager.deleteDirectory(dirPath);
        // Iterate through cache keys to find files in the directory
        for (const path of this.cacheManager.listAllFiles()) {
            if (path.startsWith(dirPath + '/')) {
                await this.cacheManager.deleteFile(path);
            }
        }
    }

    async delete(path: string) {
        await this.cacheManager.deleteFile(path);
    }

    async rename(oldPath: string, newPath: string) {
        const normalizedOldPath = normalizePath(oldPath);
        const normalizedNewPath = normalizePath(newPath);
        await this.cacheManager.rename(normalizedOldPath, normalizedNewPath);
    }

    async renameDir(oldPath: string, newPath: string) {
        const normalizedOldPath = normalizePath(oldPath);
        const normalizedNewPath = normalizePath(newPath);
        await this.cacheManager.renameDirectory(normalizedOldPath, normalizedNewPath);
    }

    listAllFiles() {
        return this.cacheManager.listAllFiles();
    }

    listAllDirectories() {
        return this.cacheManager.listAllDirectories();
    }

    async writeEmptyFile(filePath: string, type: 'binary') {
        await this.cacheManager.writeEmptyFile(filePath, type);
    }

    async clear() {
        await this.cacheManager.clear();
    }
}