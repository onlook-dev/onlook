import { Volume } from 'memfs';
import { type FileOperations, getDirName, getBaseName } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import localforage from 'localforage';
import { convertToBase64, convertFromBase64 } from '@onlook/utility';
import { normalizePath as sandboxNormalizePath } from './helpers';

export interface VirtualFileSystemOptions {
    persistenceKey?: string;
    enablePersistence?: boolean;
}

export interface FileStats {
    isFile(): boolean;
    isDirectory(): boolean;
    size: number;
    mtime: Date;
    ctime: Date;
}

export interface VirtualFileSystemInterface extends FileOperations {
    // Enhanced file operations
    readBinaryFile(filePath: string): Promise<Uint8Array | null>;
    writeBinaryFile(filePath: string, content: Uint8Array): Promise<boolean>;

    // Directory operations
    mkdir(dirPath: string, recursive?: boolean): Promise<boolean>;
    rmdir(dirPath: string, recursive?: boolean): Promise<boolean>;
    readdir(dirPath: string): Promise<string[]>;

    // File metadata
    stat(filePath: string): Promise<FileStats | null>;

    // Utility operations
    listAllFiles(): string[];
    listBinaryFiles(dir?: string): string[];
    clear(): Promise<void>;

    // Persistence
    saveToStorage(): Promise<void>;
    loadFromStorage(): Promise<void>;

    // Path utilities (compatible with both helper.ts and utility package)
    normalizePath(path: string): string;
    dirname(path: string): string;
    basename(path: string): string;
    join(...paths: string[]): string;

    // Sync operations for compatibility
    has(filePath: string): boolean;
    hasBinary(filePath: string): boolean;
    hasBinaryContent(filePath: string): boolean;
    syncFromRemote(filePath: string, remoteContent: string): Promise<boolean>;
    trackBinaryFile(filePath: string): Promise<void>;
    updateCacheBatch(entries: Array<{ path: string; content: string }>): Promise<void>;
    updateBinaryCacheBatch(entries: Array<{ path: string; content: Uint8Array }>): Promise<void>;
}

/**
 * Virtual File System implementation using memfs
 * Provides a complete in-memory file system with persistence capabilities
 */
export class VirtualFileSystem implements VirtualFileSystemInterface {
    private volume: Volume;
    private options: VirtualFileSystemOptions;
    private storageKey: string;
    private binaryStorageKey: string;

    constructor(options: VirtualFileSystemOptions = {}) {
        this.volume = new Volume();
        this.options = {
            persistenceKey: 'vfs-cache',
            enablePersistence: true,
            ...options,
        };
        this.storageKey = this.options.persistenceKey!;
        this.binaryStorageKey = `${this.options.persistenceKey}-binary`;

        makeAutoObservable(this);

        // Initialize with root directory
        this.volume.mkdirSync('/', { recursive: true });

        // Load from storage if persistence is enabled
        if (this.options.enablePersistence) {
            this.loadFromStorage().catch(console.error);
        }
    }

    // Internal VFS path utilities (always start with / for memfs)
    private toVFSPath(path: string): string {
        // Convert sandbox-relative path to VFS absolute path
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        // Normalize path separators and resolve . and ..
        return path.replace(/\\/g, '/').replace(/\/+/g, '/');
    }

    // Public path utilities
    normalizePath(path: string): string {
        return sandboxNormalizePath(path);
    }

    dirname(path: string): string {
        // Ensure path uses forward slashes and align exactly with files utility
        const normalizedPath = path.replace(/\\/g, '/');
        return getDirName(normalizedPath);
    }

    basename(path: string): string {
        const normalizedPath = path.replace(/\\/g, '/');
        return getBaseName(normalizedPath);
    }

    join(...paths: string[]): string {
        const joined = paths.filter(Boolean).join('/').replace(/\/+/g, '/');
        return sandboxNormalizePath(joined);
    }

    // Basic file operations (FileOperations interface)
    async readFile(filePath: string): Promise<string | null> {
        try {
            const vfsPath = this.toVFSPath(filePath);
            const content = this.volume.readFileSync(vfsPath, {
                encoding: 'utf8',
            }) as string;
            return content;
        } catch (error) {
            console.error(`Error reading file ${filePath}:`, error);
            return null;
        }
    }

    async writeFile(filePath: string, content: string): Promise<boolean> {
        try {
            const vfsPath = this.toVFSPath(filePath);

            // Ensure directory exists
            const vfsDirPath = this.toVFSPath(this.dirname(filePath));
            this.volume.mkdirSync(vfsDirPath, { recursive: true });

            this.volume.writeFileSync(vfsPath, content, { encoding: 'utf8' });

            if (this.options.enablePersistence) {
                await this.saveToStorage();
            }

            return true;
        } catch (error) {
            console.error(`Error writing file ${filePath}:`, error);
            return false;
        }
    }

    async fileExists(filePath: string): Promise<boolean> {
        try {
            const vfsPath = this.toVFSPath(filePath);
            return this.volume.existsSync(vfsPath);
        } catch (error) {
            return false;
        }
    }

    async delete(filePath: string, recursive: boolean = false): Promise<boolean> {
        try {
            const vfsPath = this.toVFSPath(filePath);

            if (!this.volume.existsSync(vfsPath)) {
                return false;
            }

            const stats = this.volume.statSync(vfsPath);

            if (stats.isDirectory()) {
                if (recursive) {
                    this.volume.rmSync(vfsPath, { recursive: true, force: true });
                } else {
                    this.volume.rmdirSync(vfsPath);
                }
            } else {
                this.volume.unlinkSync(vfsPath);
            }

            if (this.options.enablePersistence) {
                await this.saveToStorage();
            }

            return true;
        } catch (error) {
            console.error(`Error deleting ${filePath}:`, error);
            return false;
        }
    }

    async copy(
        source: string,
        destination: string,
        recursive: boolean = false,
        overwrite: boolean = false,
    ): Promise<boolean> {
        try {
            const vfsSource = this.toVFSPath(source);
            const vfsDest = this.toVFSPath(destination);

            if (!this.volume.existsSync(vfsSource)) {
                return false;
            }

            if (this.volume.existsSync(vfsDest) && !overwrite) {
                return false;
            }

            const stats = this.volume.statSync(vfsSource);

            if (stats.isDirectory()) {
                if (!recursive) {
                    return false;
                }

                // Create destination directory
                this.volume.mkdirSync(vfsDest, { recursive: true });

                // Copy all contents
                const entries = this.volume.readdirSync(vfsSource) as string[];
                for (const entry of entries) {
                    const srcPath = this.join(source, entry);
                    const destPath = this.join(destination, entry);
                    await this.copy(srcPath, destPath, recursive, overwrite);
                }
            } else {
                // Ensure destination directory exists
                const destDir = this.dirname(destination);
                const vfsDestDir = this.toVFSPath(destDir);
                this.volume.mkdirSync(vfsDestDir, { recursive: true });

                // Copy file
                const content = this.volume.readFileSync(vfsSource);
                this.volume.writeFileSync(vfsDest, content);
            }

            if (this.options.enablePersistence) {
                await this.saveToStorage();
            }

            return true;
        } catch (error) {
            console.error(`Error copying ${source} to ${destination}:`, error);
            return false;
        }
    }

    // Enhanced file operations
    async readBinaryFile(filePath: string): Promise<Uint8Array | null> {
        try {
            const vfsPath = this.toVFSPath(filePath);
            const content = this.volume.readFileSync(vfsPath) as Buffer;
            return new Uint8Array(content);
        } catch (error) {
            console.error(`Error reading binary file ${filePath}:`, error);
            return null;
        }
    }

    async writeBinaryFile(filePath: string, content: Uint8Array): Promise<boolean> {
        try {
            const vfsPath = this.toVFSPath(filePath);

            // Ensure directory exists
            const vfsDirPath = this.toVFSPath(this.dirname(filePath));
            this.volume.mkdirSync(vfsDirPath, { recursive: true });

            this.volume.writeFileSync(vfsPath, Buffer.from(content));

            if (this.options.enablePersistence) {
                await this.saveToStorage();
            }

            return true;
        } catch (error) {
            console.error(`Error writing binary file ${filePath}:`, error);
            return false;
        }
    }

    // Directory operations
    async mkdir(dirPath: string, recursive: boolean = false): Promise<boolean> {
        try {
            const vfsPath = this.toVFSPath(dirPath);
            this.volume.mkdirSync(vfsPath, { recursive });

            if (this.options.enablePersistence) {
                await this.saveToStorage();
            }

            return true;
        } catch (error) {
            console.error(`Error creating directory ${dirPath}:`, error);
            return false;
        }
    }

    async rmdir(dirPath: string, recursive: boolean = false): Promise<boolean> {
        try {
            const vfsPath = this.toVFSPath(dirPath);

            if (recursive) {
                this.volume.rmSync(vfsPath, { recursive: true, force: true });
            } else {
                this.volume.rmdirSync(vfsPath);
            }

            if (this.options.enablePersistence) {
                await this.saveToStorage();
            }

            return true;
        } catch (error) {
            console.error(`Error removing directory ${dirPath}:`, error);
            return false;
        }
    }

    async readdir(dirPath: string): Promise<string[]> {
        try {
            const vfsPath = this.toVFSPath(dirPath);
            const entries = this.volume.readdirSync(vfsPath) as string[];
            return entries;
        } catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error);
            return [];
        }
    }

    // File metadata
    async stat(filePath: string): Promise<FileStats | null> {
        try {
            const vfsPath = this.toVFSPath(filePath);
            const stats = this.volume.statSync(vfsPath);

            return {
                isFile: () => stats.isFile(),
                isDirectory: () => stats.isDirectory(),
                size: stats.size,
                mtime: stats.mtime,
                ctime: stats.ctime,
            };
        } catch (error) {
            console.error(`Error getting stats for ${filePath}:`, error);
            return null;
        }
    }

    // Utility operations
    listAllFiles(): string[] {
        const files: string[] = [];

        const walkDir = (vfsPath: string, sandboxPath: string = '') => {
            try {
                const entries = this.volume.readdirSync(vfsPath) as string[];

                for (const entry of entries) {
                    const fullVfsPath = vfsPath === '/' ? `/${entry}` : `${vfsPath}/${entry}`;
                    const fullSandboxPath = sandboxPath ? `${sandboxPath}/${entry}` : entry;
                    const stats = this.volume.statSync(fullVfsPath);

                    if (stats.isFile()) {
                        files.push(fullSandboxPath);
                    } else if (stats.isDirectory()) {
                        walkDir(fullVfsPath, fullSandboxPath);
                    }
                }
            } catch (error) {
                console.error(`Error walking directory ${vfsPath}:`, error);
            }
        };

        walkDir('/');
        return files;
    }

    listBinaryFiles(dir: string = ''): string[] {
        const binaryExtensions = [
            '.png',
            '.jpg',
            '.jpeg',
            '.gif',
            '.bmp',
            '.svg',
            '.ico',
            '.webp',
            '.pdf',
            '.zip',
            '.tar',
            '.gz',
        ];
        const allFiles = this.listAllFiles();

        return allFiles.filter((file) => {
            if (dir && !file.startsWith(dir)) {
                return false;
            }

            const ext = file.toLowerCase().substring(file.lastIndexOf('.'));
            return binaryExtensions.includes(ext);
        });
    }

    async clear(): Promise<void> {
        try {
            // Remove all files and directories except root
            const entries = this.volume.readdirSync('/') as string[];

            for (const entry of entries) {
                const fullPath = this.join('/', entry);
                await this.delete(fullPath, true);
            }

            if (this.options.enablePersistence) {
                await this.clearStorage();
            }
        } catch (error) {
            console.error('Error clearing file system:', error);
        }
    }

    // Persistence methods
    async saveToStorage(): Promise<void> {
        if (!this.options.enablePersistence) {
            return;
        }

        try {
            const textFiles: Record<string, string> = {};
            const binaryFiles: Record<string, string> = {};

            const allFiles = this.listAllFiles();

            for (const sandboxPath of allFiles) {
                try {
                    const vfsPath = this.toVFSPath(sandboxPath);
                    // Try to read as text first
                    const textContent = this.volume.readFileSync(vfsPath, {
                        encoding: 'utf8',
                    }) as string;
                    textFiles[sandboxPath] = textContent;
                } catch {
                    // If text reading fails, read as binary
                    try {
                        const vfsPath = this.toVFSPath(sandboxPath);
                        const binaryContent = this.volume.readFileSync(vfsPath) as Buffer;
                        binaryFiles[sandboxPath] = convertToBase64(new Uint8Array(binaryContent));
                    } catch (error) {
                        console.error(`Error reading file ${sandboxPath} for persistence:`, error);
                    }
                }
            }

            // Save text files
            await localforage.setItem(this.storageKey, textFiles);

            // Save binary files
            await localforage.setItem(this.binaryStorageKey, binaryFiles);
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }

    async loadFromStorage(): Promise<void> {
        if (!this.options.enablePersistence) {
            return;
        }

        try {
            // Load text files
            const textFiles = await localforage.getItem<Record<string, string>>(this.storageKey);
            if (textFiles) {
                for (const [sandboxPath, content] of Object.entries(textFiles)) {
                    try {
                        const vfsPath = this.toVFSPath(sandboxPath);
                        const vfsDirPath = this.toVFSPath(this.dirname(sandboxPath));
                        this.volume.mkdirSync(vfsDirPath, { recursive: true });
                        this.volume.writeFileSync(vfsPath, content, { encoding: 'utf8' });
                    } catch (error) {
                        console.error(`Error restoring text file ${sandboxPath}:`, error);
                    }
                }
            }

            // Load binary files
            const binaryFiles = await localforage.getItem<Record<string, string>>(
                this.binaryStorageKey,
            );
            if (binaryFiles) {
                for (const [sandboxPath, base64Content] of Object.entries(binaryFiles)) {
                    try {
                        const vfsPath = this.toVFSPath(sandboxPath);
                        const vfsDirPath = this.toVFSPath(this.dirname(sandboxPath));
                        this.volume.mkdirSync(vfsDirPath, { recursive: true });
                        const binaryContent = convertFromBase64(base64Content);
                        this.volume.writeFileSync(vfsPath, Buffer.from(binaryContent));
                    } catch (error) {
                        console.error(`Error restoring binary file ${sandboxPath}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading from storage:', error);
        }
    }

    private async clearStorage(): Promise<void> {
        try {
            await localforage.removeItem(this.storageKey);
            await localforage.removeItem(this.binaryStorageKey);
        } catch (error) {
            console.error('Error clearing storage:', error);
        }
    }

    // Additional utility methods for compatibility with existing code
    async updateCache(filePath: string, content: string): Promise<void> {
        await this.writeFile(filePath, content);
    }

    async updateBinaryCache(filePath: string, content: Uint8Array): Promise<void> {
        await this.writeBinaryFile(filePath, content);
    }

    has(filePath: string): boolean {
        return this.volume.existsSync(this.toVFSPath(filePath));
    }

    hasBinary(filePath: string): boolean {
        const vfsPath = this.toVFSPath(filePath);
        if (!this.volume.existsSync(vfsPath)) {
            return false;
        }

        // Check if it's a binary file by extension
        const binaryExtensions = [
            '.png',
            '.jpg',
            '.jpeg',
            '.gif',
            '.bmp',
            '.svg',
            '.ico',
            '.webp',
            '.pdf',
            '.zip',
            '.tar',
            '.gz',
        ];
        const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
        return binaryExtensions.includes(ext);
    }

    // Batch operations for performance
    async updateCacheBatch(entries: Array<{ path: string; content: string }>): Promise<void> {
        for (const { path, content } of entries) {
            await this.writeFile(path, content);
        }
    }

    async updateBinaryCacheBatch(
        entries: Array<{ path: string; content: Uint8Array }>,
    ): Promise<void> {
        for (const { path, content } of entries) {
            await this.writeBinaryFile(path, content);
        }
    }

    // Sync operations for compatibility
    async syncFromRemote(filePath: string, remoteContent: string): Promise<boolean> {
        const currentContent = await this.readFile(filePath);
        const contentChanged = currentContent !== remoteContent;

        if (contentChanged) {
            await this.writeFile(filePath, remoteContent);
        }

        return contentChanged;
    }

    // Track binary file without loading content (for lazy loading)
    async trackBinaryFile(filePath: string): Promise<void> {
        if (!this.has(filePath)) {
            // Create empty placeholder file
            await this.writeBinaryFile(filePath, new Uint8Array(0));
        }
    }

    // Check if binary file has actual content loaded
    hasBinaryContent(filePath: string): boolean {
        const vfsPath = this.toVFSPath(filePath);
        if (!this.volume.existsSync(vfsPath)) {
            return false;
        }

        try {
            const stats = this.volume.statSync(vfsPath);
            return stats.size > 0;
        } catch {
            return false;
        }
    }
}
