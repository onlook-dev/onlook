'use client';

import type { SandboxDirectory, SandboxFile } from '@onlook/models';
import FS from '@isomorphic-git/lightning-fs';

export class LightningFileCacheManager {
    private fs: FS;
    private fsPromises: any;
    private basePath: string;
    private filesPath: string;
    private directoriesPath: string;

    constructor(projectId: string, branchId: string) {
        this.basePath = `/cache/${projectId}/${branchId}`;
        this.filesPath = `${this.basePath}/files`;
        this.directoriesPath = `${this.basePath}/directories`;
        
        // Use a unique name for the cache filesystem
        this.fs = new FS(`onlook-cache-${projectId}-${branchId}`);
        this.fsPromises = this.fs.promises;
    }

    async init(): Promise<void> {
        try {
            // Ensure cache directories exist
            await this.ensureDir(this.basePath);
            await this.ensureDir(this.filesPath);
            await this.ensureDir(this.directoriesPath);
        } catch (error) {
            console.error('Error initializing LightningFileCacheManager:', error);
        }
    }

    // File cache methods
    hasFile(filePath: string): boolean {
        try {
            const cachePath = this.getFileCachePath(filePath);
            // Synchronous check - we'll use a simple approach
            // Note: This is a limitation - LightningFS is async, but we need sync check
            // We'll maintain an in-memory index for quick lookups
            return this.fileIndex.has(filePath);
        } catch {
            return false;
        }
    }

    // Simple in-memory index for quick file existence checks
    private fileIndex = new Set<string>();
    private directoryIndex = new Set<string>();

    async getFile(filePath: string): Promise<SandboxFile | undefined> {
        try {
            const cachePath = this.getFileCachePath(filePath);
            const content = await this.fsPromises.readFile(cachePath, 'utf8');
            const file = JSON.parse(content) as SandboxFile;
            return file;
        } catch (error) {
            return undefined;
        }
    }

    async setFile(file: SandboxFile, contentHash?: string): Promise<void> {
        try {
            const cachePath = this.getFileCachePath(file.path);
            await this.ensureDir(this.getParentDir(cachePath));
            
            // Add metadata for caching
            const cachedFile = {
                ...file,
                _cached: true,
                _cachedAt: Date.now(),
                _contentHash: contentHash
            };
            
            await this.fsPromises.writeFile(cachePath, JSON.stringify(cachedFile));
            this.fileIndex.add(file.path);
        } catch (error) {
            console.error(`Error caching file ${file.path}:`, error);
        }
    }

    async deleteFile(filePath: string): Promise<boolean> {
        try {
            const cachePath = this.getFileCachePath(filePath);
            await this.fsPromises.unlink(cachePath);
            this.fileIndex.delete(filePath);
            return true;
        } catch {
            return false;
        }
    }

    // Directory cache methods
    hasDirectory(dirPath: string): boolean {
        return this.directoryIndex.has(dirPath);
    }

    async setDirectory(directory: SandboxDirectory): Promise<void> {
        try {
            const cachePath = this.getDirectoryCachePath(directory.path);
            await this.ensureDir(this.getParentDir(cachePath));
            
            const cachedDir = {
                ...directory,
                _cached: true,
                _cachedAt: Date.now()
            };
            
            await this.fsPromises.writeFile(cachePath, JSON.stringify(cachedDir));
            this.directoryIndex.add(directory.path);
        } catch (error) {
            console.error(`Error caching directory ${directory.path}:`, error);
        }
    }

    async deleteDirectory(dirPath: string): Promise<boolean> {
        try {
            const cachePath = this.getDirectoryCachePath(dirPath);
            await this.fsPromises.unlink(cachePath);
            this.directoryIndex.delete(dirPath);
            return true;
        } catch {
            return false;
        }
    }

    isFileLoaded(file: SandboxFile): boolean {
        return file && file.content !== null;
    }

    async readOrFetch(
        filePath: string,
        readFile: (path: string) => Promise<SandboxFile | null>,
    ): Promise<SandboxFile | null> {
        const cachedFile = await this.getFile(filePath);
        if (cachedFile && cachedFile.content !== null) {
            return cachedFile;
        }

        const newFile = await readFile(filePath);
        if (newFile) {
            await this.setFile(newFile);
        }
        return newFile;
    }

    async write(
        filePath: string,
        content: string | Uint8Array,
        writeFile: (path: string, content: string | Uint8Array) => Promise<boolean>,
    ): Promise<boolean> {
        try {
            const writeSuccess = await writeFile(filePath, content);
            if (writeSuccess) {
                const type = content instanceof Uint8Array ? 'binary' : 'text';
                const newFile: SandboxFile = {
                    type,
                    path: filePath,
                    content,
                } as SandboxFile;
                await this.setFile(newFile);
            }
            return writeSuccess;
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    async rename(oldPath: string, newPath: string): Promise<void> {
        const oldFile = await this.getFile(oldPath);
        if (oldFile) {
            const newFile = { ...oldFile, path: newPath };
            await this.setFile(newFile);
            await this.deleteFile(oldPath);
        }
    }

    async renameDirectory(oldPath: string, newPath: string): Promise<void> {
        // For directory renames, we need to update all files in the directory
        // This is a simplified implementation - in production you might want to batch this
        const normalizeDir = (path: string): string => {
            if (path === '/' || path === '') return '/';
            const normalized = path.replace(/\/+$/, '');
            return normalized === '' ? '/' : normalized;
        };

        const normalizedOldPath = normalizeDir(oldPath);
        const normalizedNewPath = normalizeDir(newPath);

        if (normalizedOldPath === normalizedNewPath) {
            return;
        }

        if (normalizedOldPath === '/') {
            throw new Error('Cannot rename root directory');
        }

        // Update all files that start with the old path
        const prefix = normalizedOldPath === '/' ? '/' : normalizedOldPath + '/';
        
        // Note: This is a simplified implementation
        // In a real implementation, you'd iterate through the cached files
        for (const filePath of this.fileIndex) {
            if (filePath.startsWith(prefix)) {
                const cachedFile = await this.getFile(filePath);
                if (cachedFile) {
                    const relativePath = filePath.substring(prefix.length);
                    const newFilePath = normalizedNewPath === '/'
                        ? '/' + relativePath
                        : normalizedNewPath + '/' + relativePath;
                    const updatedFile = { ...cachedFile, path: newFilePath };
                    await this.setFile(updatedFile);
                    await this.deleteFile(filePath);
                }
            }
        }

        // Update directories
        for (const dirPath of this.directoryIndex) {
            if (dirPath.startsWith(prefix)) {
                const relativePath = dirPath.substring(prefix.length);
                const newDirPath = normalizedNewPath === '/'
                    ? '/' + relativePath
                    : normalizedNewPath + '/' + relativePath;
                await this.setDirectory({ type: 'directory', path: newDirPath });
                await this.deleteDirectory(dirPath);
            }
        }

        // Update the directory itself
        if (this.directoryIndex.has(normalizedOldPath)) {
            await this.setDirectory({ type: 'directory', path: normalizedNewPath });
            await this.deleteDirectory(normalizedOldPath);
        }
    }

    listAllFiles(): string[] {
        return Array.from(this.fileIndex);
    }

    listAllDirectories(): string[] {
        return Array.from(this.directoryIndex);
    }

    async writeEmptyFile(filePath: string, type: 'binary'): Promise<void> {
        if (this.hasFile(filePath)) {
            return;
        }

        const emptyFile: SandboxFile = {
            type,
            path: filePath,
            content: null,
        };
        await this.setFile(emptyFile);
    }

    async clear(): Promise<void> {
        try {
            // Clear the entire cache directory
            await this.deleteDirectoryRecursive(this.basePath);
            
            // Clear in-memory indices
            this.fileIndex.clear();
            this.directoryIndex.clear();
            
            // Recreate base directories
            await this.init();
        } catch (error) {
            console.error('Error clearing lightning file cache:', error);
        }
    }

    get fileCount(): number {
        return this.fileIndex.size;
    }

    get directoryCount(): number {
        return this.directoryIndex.size;
    }

    // Helper methods
    private getFileCachePath(filePath: string): string {
        // Convert file path to safe cache path
        const safePath = filePath.replace(/[^a-zA-Z0-9\/\-_.]/g, '_');
        return `${this.filesPath}${safePath}.json`;
    }

    private getDirectoryCachePath(dirPath: string): string {
        const safePath = dirPath.replace(/[^a-zA-Z0-9\/\-_.]/g, '_');
        return `${this.directoriesPath}${safePath}.json`;
    }

    private getParentDir(path: string): string {
        const parts = path.split('/').filter(Boolean);
        if (parts.length <= 1) {
            return '/';
        }
        return '/' + parts.slice(0, -1).join('/');
    }

    private async ensureDir(dirPath: string): Promise<void> {
        try {
            await this.fsPromises.stat(dirPath);
        } catch {
            const parentDir = this.getParentDir(dirPath);
            if (parentDir !== '/' && parentDir !== dirPath) {
                await this.ensureDir(parentDir);
            }
            try {
                await this.fsPromises.mkdir(dirPath);
            } catch (error) {
                // Ignore if directory already exists
                if ((error as any).code !== 'EEXIST') {
                    throw error;
                }
            }
        }
    }

    private async deleteDirectoryRecursive(dirPath: string): Promise<void> {
        try {
            const entries = await this.fsPromises.readdir(dirPath);
            for (const entry of entries) {
                const entryPath = `${dirPath}/${entry}`;
                const stats = await this.fsPromises.stat(entryPath);
                
                if (stats.isDirectory()) {
                    await this.deleteDirectoryRecursive(entryPath);
                } else {
                    await this.fsPromises.unlink(entryPath);
                }
            }
            await this.fsPromises.rmdir(dirPath);
        } catch (error) {
            // Ignore errors if directory doesn't exist
        }
    }

    // Populate in-memory indices on initialization
    async populateIndices(): Promise<void> {
        try {
            await this.populateFileIndex(this.filesPath);
            await this.populateDirectoryIndex(this.directoriesPath);
        } catch (error) {
            // Ignore errors during index population
            console.debug('Error populating cache indices:', error);
        }
    }

    private async populateFileIndex(dirPath: string): Promise<void> {
        try {
            const entries = await this.fsPromises.readdir(dirPath);
            for (const entry of entries) {
                if (entry.endsWith('.json')) {
                    const entryPath = `${dirPath}/${entry}`;
                    try {
                        const content = await this.fsPromises.readFile(entryPath, 'utf8');
                        const file = JSON.parse(content) as SandboxFile;
                        this.fileIndex.add(file.path);
                    } catch {
                        // Skip corrupted cache files
                    }
                }
            }
        } catch {
            // Directory might not exist yet
        }
    }

    private async populateDirectoryIndex(dirPath: string): Promise<void> {
        try {
            const entries = await this.fsPromises.readdir(dirPath);
            for (const entry of entries) {
                if (entry.endsWith('.json')) {
                    const entryPath = `${dirPath}/${entry}`;
                    try {
                        const content = await this.fsPromises.readFile(entryPath, 'utf8');
                        const dir = JSON.parse(content) as SandboxDirectory;
                        this.directoryIndex.add(dir.path);
                    } catch {
                        // Skip corrupted cache files
                    }
                }
            }
        } catch {
            // Directory might not exist yet
        }
    }
}