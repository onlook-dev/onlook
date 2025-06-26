import { Volume } from 'memfs';
import { type FileOperations } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import localforage from 'localforage';
import { convertToBase64, convertFromBase64 } from '@onlook/utility';

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

    // Path utilities
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

    // Path utilities
    normalizePath(path: string): string {
        // Ensure path starts with /
        if (!path.startsWith('/')) {
            path = '/' + path;
        }
        // Normalize path separators and resolve . and ..
        return path.replace(/\\/g, '/').replace(/\/+/g, '/');
    }

    dirname(path: string): string {
        const normalized = this.normalizePath(path);
        const lastSlash = normalized.lastIndexOf('/');
        if (lastSlash === 0) return '/';
        if (lastSlash === -1) return '.';
        return normalized.substring(0, lastSlash);
    }

    basename(path: string): string {
        const normalized = this.normalizePath(path);
        const lastSlash = normalized.lastIndexOf('/');
        return normalized.substring(lastSlash + 1);
    }

    join(...paths: string[]): string {
        return this.normalizePath(paths.join('/'));
    }

    // Basic file operations (FileOperations interface)
    async readFile(filePath: string): Promise<string | null> {
        try {
            const normalizedPath = this.normalizePath(filePath);
            const content = this.volume.readFileSync(normalizedPath, {
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
            const normalizedPath = this.normalizePath(filePath);

            // Ensure directory exists
            const dirPath = this.dirname(normalizedPath);
            await this.mkdir(dirPath, true);

            this.volume.writeFileSync(normalizedPath, content, { encoding: 'utf8' });

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
            const normalizedPath = this.normalizePath(filePath);
            return this.volume.existsSync(normalizedPath);
        } catch (error) {
            return false;
        }
    }

    async delete(filePath: string, recursive: boolean = false): Promise<boolean> {
        try {
            const normalizedPath = this.normalizePath(filePath);

            if (!this.volume.existsSync(normalizedPath)) {
                return false;
            }

            const stats = this.volume.statSync(normalizedPath);

            if (stats.isDirectory()) {
                if (recursive) {
                    this.volume.rmSync(normalizedPath, { recursive: true, force: true });
                } else {
                    this.volume.rmdirSync(normalizedPath);
                }
            } else {
                this.volume.unlinkSync(normalizedPath);
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
            const normalizedSource = this.normalizePath(source);
            const normalizedDest = this.normalizePath(destination);

            if (!this.volume.existsSync(normalizedSource)) {
                return false;
            }

            if (this.volume.existsSync(normalizedDest) && !overwrite) {
                return false;
            }

            const stats = this.volume.statSync(normalizedSource);

            if (stats.isDirectory()) {
                if (!recursive) {
                    return false;
                }

                // Create destination directory
                await this.mkdir(normalizedDest, true);

                // Copy all contents
                const entries = this.volume.readdirSync(normalizedSource) as string[];
                for (const entry of entries) {
                    const srcPath = this.join(normalizedSource, entry);
                    const destPath = this.join(normalizedDest, entry);
                    await this.copy(srcPath, destPath, recursive, overwrite);
                }
            } else {
                // Ensure destination directory exists
                const destDir = this.dirname(normalizedDest);
                await this.mkdir(destDir, true);

                // Copy file
                const content = this.volume.readFileSync(normalizedSource);
                this.volume.writeFileSync(normalizedDest, content);
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
            const normalizedPath = this.normalizePath(filePath);
            const content = this.volume.readFileSync(normalizedPath) as Buffer;
            return new Uint8Array(content);
        } catch (error) {
            console.error(`Error reading binary file ${filePath}:`, error);
            return null;
        }
    }

    async writeBinaryFile(filePath: string, content: Uint8Array): Promise<boolean> {
        try {
            const normalizedPath = this.normalizePath(filePath);

            // Ensure directory exists
            const dirPath = this.dirname(normalizedPath);
            await this.mkdir(dirPath, true);

            this.volume.writeFileSync(normalizedPath, Buffer.from(content));

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
            const normalizedPath = this.normalizePath(dirPath);
            this.volume.mkdirSync(normalizedPath, { recursive });

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
            const normalizedPath = this.normalizePath(dirPath);

            if (recursive) {
                this.volume.rmSync(normalizedPath, { recursive: true, force: true });
            } else {
                this.volume.rmdirSync(normalizedPath);
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
            const normalizedPath = this.normalizePath(dirPath);
            const entries = this.volume.readdirSync(normalizedPath) as string[];
            return entries;
        } catch (error) {
            console.error(`Error reading directory ${dirPath}:`, error);
            return [];
        }
    }

    // File metadata
    async stat(filePath: string): Promise<FileStats | null> {
        try {
            const normalizedPath = this.normalizePath(filePath);
            const stats = this.volume.statSync(normalizedPath);

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

        const walkDir = (dirPath: string) => {
            try {
                const entries = this.volume.readdirSync(dirPath) as string[];

                for (const entry of entries) {
                    const fullPath = this.join(dirPath, entry);
                    const stats = this.volume.statSync(fullPath);

                    if (stats.isFile()) {
                        files.push(fullPath);
                    } else if (stats.isDirectory()) {
                        walkDir(fullPath);
                    }
                }
            } catch (error) {
                console.error(`Error walking directory ${dirPath}:`, error);
            }
        };

        walkDir('/');
        return files;
    }

    listBinaryFiles(dir: string = '/'): string[] {
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
            if (dir !== '/' && !file.startsWith(this.normalizePath(dir))) {
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

            for (const filePath of allFiles) {
                try {
                    // Try to read as text first
                    const textContent = this.volume.readFileSync(filePath, {
                        encoding: 'utf8',
                    }) as string;
                    textFiles[filePath] = textContent;
                } catch {
                    // If text reading fails, read as binary
                    try {
                        const binaryContent = this.volume.readFileSync(filePath) as Buffer;
                        binaryFiles[filePath] = convertToBase64(new Uint8Array(binaryContent));
                    } catch (error) {
                        console.error(`Error reading file ${filePath} for persistence:`, error);
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
                for (const [filePath, content] of Object.entries(textFiles)) {
                    try {
                        const dirPath = this.dirname(filePath);
                        await this.mkdir(dirPath, true);
                        this.volume.writeFileSync(filePath, content, { encoding: 'utf8' });
                    } catch (error) {
                        console.error(`Error restoring text file ${filePath}:`, error);
                    }
                }
            }

            // Load binary files
            const binaryFiles = await localforage.getItem<Record<string, string>>(
                this.binaryStorageKey,
            );
            if (binaryFiles) {
                for (const [filePath, base64Content] of Object.entries(binaryFiles)) {
                    try {
                        const dirPath = this.dirname(filePath);
                        await this.mkdir(dirPath, true);
                        const binaryContent = convertFromBase64(base64Content);
                        this.volume.writeFileSync(filePath, Buffer.from(binaryContent));
                    } catch (error) {
                        console.error(`Error restoring binary file ${filePath}:`, error);
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
        return this.volume.existsSync(this.normalizePath(filePath));
    }

    hasBinary(filePath: string): boolean {
        const normalizedPath = this.normalizePath(filePath);
        if (!this.volume.existsSync(normalizedPath)) {
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
        const ext = normalizedPath.toLowerCase().substring(normalizedPath.lastIndexOf('.'));
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
        const normalizedPath = this.normalizePath(filePath);
        const currentContent = await this.readFile(normalizedPath);
        const contentChanged = currentContent !== remoteContent;

        if (contentChanged) {
            await this.writeFile(normalizedPath, remoteContent);
        }

        return contentChanged;
    }

    // Track binary file without loading content (for lazy loading)
    async trackBinaryFile(filePath: string): Promise<void> {
        const normalizedPath = this.normalizePath(filePath);
        if (!this.has(normalizedPath)) {
            // Create empty placeholder file
            await this.writeBinaryFile(normalizedPath, new Uint8Array(0));
        }
    }

    // Check if binary file has actual content loaded
    hasBinaryContent(filePath: string): boolean {
        const normalizedPath = this.normalizePath(filePath);
        if (!this.volume.existsSync(normalizedPath)) {
            return false;
        }

        try {
            const stats = this.volume.statSync(normalizedPath);
            return stats.size > 0;
        } catch {
            return false;
        }
    }
}
