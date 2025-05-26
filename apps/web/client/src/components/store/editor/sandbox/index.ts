import type { WatchEvent } from '@codesandbox/sdk';
import { IGNORED_DIRECTORIES, JS_FILE_EXTENSIONS, JSX_FILE_EXTENSIONS } from '@onlook/constants';
import { type TemplateNode } from '@onlook/models';
import { getContentFromTemplateNode } from '@onlook/parser';
import { isSubdirectory } from '@onlook/utility';
import localforage from 'localforage';
import { makeAutoObservable, reaction } from 'mobx';
import type { EditorEngine } from '../engine';
import { FileEventBus } from './file-event-bus';
import { FileSyncManager } from './file-sync';
import { FileWatcher } from './file-watcher';
import { formatContent, normalizePath } from './helpers';
import { TemplateNodeMapper } from './mapping';
import { SessionManager } from './session';

export class SandboxManager {
    readonly session: SessionManager
    private fileWatcher: FileWatcher | null = null;
    private fileSync: FileSyncManager = new FileSyncManager();
    private templateNodeMap: TemplateNodeMapper = new TemplateNodeMapper(localforage);
    readonly fileEventBus: FileEventBus = new FileEventBus();

    constructor(private readonly editorEngine: EditorEngine) {
        this.session = new SessionManager(this.editorEngine);
        makeAutoObservable(this);

        reaction(
            () => this.session.session,
            (session) => {
                if (session) {
                    this.fileSync.clear(); // Clear cache when switching projects
                    this.index();
                }
            },
        );
    }

    async index() {
        if (!this.session.session) {
            console.error('No session found');
            return;
        }

        const files = await this.listFilesRecursively('./', IGNORED_DIRECTORIES, [
            ...JSX_FILE_EXTENSIONS,
            ...JS_FILE_EXTENSIONS,
            'css',
        ]);
        for (const file of files) {
            const normalizedPath = normalizePath(file);
            const content = await this.readFile(normalizedPath);
            if (content === null) {
                console.error(`Failed to read file ${normalizedPath}`);
                continue;
            }

            await this.processFileForMapping(normalizedPath);
        }

        await this.watchFiles();
    }

    private async readRemoteFile(filePath: string): Promise<string | null> {
        if (!this.session.session) {
            console.error('No session found for remote read');
            return null;
        }

        try {
            return await this.session.session.fs.readTextFile(filePath);
        } catch (error) {
            console.error(`Error reading remote file ${filePath}:`, error);
            return null;
        }
    }

    private async readRemoteBinaryFile(filePath: string): Promise<Uint8Array | null> {
        if (!this.session.session) {
            console.error('No session found for remote binary read');
            return null;
        }

        try {
            return await this.session.session.fs.readFile(filePath);
        } catch (error) {
            console.error(`Error reading remote binary file ${filePath}:`, error);
            return null;
        }
    }

    private async writeRemoteFile(filePath: string, fileContent: string): Promise<boolean> {
        if (!this.session.session) {
            console.error('No session found for remote write');
            return false;
        }

        try {
            await this.processFileForMapping(filePath);
            await this.session.session.fs.writeTextFile(filePath, fileContent);
            return true;
        } catch (error) {
            console.error(`Error writing remote file ${filePath}:`, error);
            return false;
        }
    }

    private async writeRemoteBinaryFile(
        filePath: string,
        fileContent: Buffer | Uint8Array,
    ): Promise<boolean> {
        if (!this.session.session) {
            console.error('No session found for remote binary write');
            return false;
        }

        try {
            await this.session.session.fs.writeFile(filePath, fileContent);
            return true;
        } catch (error) {
            console.error(`Error writing remote binary file ${filePath}:`, error);
            return false;
        }
    }

    async readFile(path: string): Promise<string | null> {
        const normalizedPath = normalizePath(path);
        return this.fileSync.readOrFetch(normalizedPath, this.readRemoteFile.bind(this));
    }

    async readFiles(paths: string[]): Promise<Record<string, string>> {
        const results: Record<string, string> = {};
        for (const path of paths) {
            const content = await this.readFile(path);
            if (!content) {
                console.error(`Failed to read file ${path}`);
                continue;
            }
            results[path] = content;
        }
        return results;
    }
    async readBinaryFile(path: string): Promise<Uint8Array | null> {
        const normalizedPath = normalizePath(path);
        try {
            return await this.readRemoteBinaryFile(normalizedPath);
        } catch (error) {
            console.error(`Error reading binary file ${normalizedPath}:`, error);
            return null;
        }
    }

    async writeFile(path: string, content: string): Promise<boolean> {
        const normalizedPath = normalizePath(path);
        const formattedContent = await formatContent(normalizedPath, content);
        return this.fileSync.write(normalizedPath, formattedContent, this.writeRemoteFile.bind(this));
    }

    listAllFiles() {
        return this.fileSync.listAllFiles();
    }

    async listFiles(dir: string) {
        return this.session.session?.fs.readdir(dir);
    }

    async writeBinaryFile(path: string, content: Buffer | Uint8Array): Promise<boolean> {
        const normalizedPath = normalizePath(path);
        try {
            // TODO: Implement binary file sync
            return await this.writeRemoteBinaryFile(normalizedPath, content);
        } catch (error) {
            console.error(`Error writing binary file ${normalizedPath}:`, error);
            return false;
        }
    }

    async listFilesRecursively(
        dir: string,
        ignore: string[] = [],
        extensions: string[] = [],
    ): Promise<string[]> {
        if (!this.session.session) {
            console.error('No session found');
            return [];
        }

        const results: string[] = [];
        const entries = await this.session.session.fs.readdir(dir);

        for (const entry of entries) {
            const fullPath = `${dir}/${entry.name}`;
            const normalizedPath = normalizePath(fullPath);
            if (entry.type === 'directory') {
                if (ignore.includes(entry.name)) {
                    continue;
                }
                const subFiles = await this.listFilesRecursively(
                    normalizedPath,
                    ignore,
                    extensions,
                );
                results.push(...subFiles);
            } else {
                if (
                    extensions.length > 0 &&
                    !extensions.includes(entry.name.split('.').pop() ?? '')
                ) {
                    continue;
                }
                results.push(normalizedPath);
            }
        }
        return results;
    }

    async watchFiles() {
        if (!this.session.session) {
            console.error('No session found');
            return;
        }

        // Dispose of existing watcher if it exists
        if (this.fileWatcher) {
            this.fileWatcher.dispose();
            this.fileWatcher = null;
        }

        // Convert ignored directories to glob patterns with ** wildcard
        const excludePatterns = IGNORED_DIRECTORIES.map((dir) => `${dir}/**`);

        this.fileWatcher = new FileWatcher({
            session: this.session.session,
            onFileChange: async (event) => {
                await this.handleFileChange(event);
            },
            excludePatterns,
            fileEventBus: this.fileEventBus
        });

        await this.fileWatcher.start();
    }

    async handleFileChange(event: WatchEvent) {
        for (const path of event.paths) {
            if (isSubdirectory(path, IGNORED_DIRECTORIES)) {
                continue;
            }
            const normalizedPath = normalizePath(path);
            const eventType = event.type;
            if (event.type === 'remove') {
                await this.fileSync.delete(normalizedPath);
            } else if (eventType === 'change' || eventType === 'add') {
                const content = await this.readRemoteFile(normalizedPath);
                if (content === null) {
                    console.error(`File content for ${normalizedPath} not found`);
                    continue;
                }
                const contentChanged = await this.fileSync.syncFromRemote(normalizedPath, content);
                if (contentChanged) {
                    await this.processFileForMapping(normalizedPath);
                }
            }
            this.fileEventBus.publish({
                type: eventType,
                paths: [normalizedPath],
                timestamp: Date.now()
            });
        }
    }

    async processFileForMapping(file: string) {
        const extension = file.split('.').pop();
        if (!extension || !JSX_FILE_EXTENSIONS.includes(extension)) {
            return;
        }

        const normalizedPath = normalizePath(file);
        await this.templateNodeMap.processFileForMapping(
            normalizedPath,
            this.readFile.bind(this),
            this.writeFile.bind(this),
        );
    }

    async getTemplateNode(oid: string): Promise<TemplateNode | null> {
        return this.templateNodeMap.getTemplateNode(oid);
    }

    async getCodeBlock(oid: string): Promise<string | null> {
        const templateNode = this.templateNodeMap.getTemplateNode(oid);
        if (!templateNode) {
            console.error(`No template node found for oid ${oid}`);
            return null;
        }

        const content = await this.readFile(templateNode.path);
        if (!content) {
            console.error(`No file found for template node ${oid}`);
            return null;
        }

        const codeBlock = await getContentFromTemplateNode(templateNode, content);
        return codeBlock;
    }

    clear() {
        this.fileWatcher?.dispose();
        this.fileWatcher = null;
        this.fileSync.clear();
        this.templateNodeMap.clear();
    }
}
