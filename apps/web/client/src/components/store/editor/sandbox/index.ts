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
import { SandboxAdapterFactory } from './adapters/factory';
import { SandboxProviderType } from './providers/interface';
import type { SandboxAdapter, WatchEvent } from './adapters/interface';
import { CLISessionImpl, CLISessionType, type CLISession, type TerminalSession } from './terminal';

export class SandboxManager {
    private adapter: SandboxAdapter | null = null;
    private fileSync: FileSyncManager = new FileSyncManager();
    private templateNodeMap: TemplateNodeMapper = new TemplateNodeMapper(localforage);
    readonly fileEventBus: FileEventBus = new FileEventBus();
    
    // Terminal session management
    terminalSessions: Map<string, CLISession> = new Map();
    activeTerminalSessionId: string = 'cli';

    constructor(private readonly editorEngine: EditorEngine) {
        makeAutoObservable(this);
    }

    async initialize(providerType: SandboxProviderType) {
        const adapterFactory = SandboxAdapterFactory.getInstance();
        this.adapter = adapterFactory.getAdapter(providerType);
    }

    async start(sandboxId: string, userId: string, providerType: SandboxProviderType) {
        await this.initialize(providerType);
        const session = await this.adapter!.start(sandboxId, userId);
        await this.createTerminalSessions(session);
        await this.index();
    }

    async createTerminalSessions(session: any) {
        const task = new CLISessionImpl('Server (readonly)', CLISessionType.TASK, session, this.editorEngine.error);
        this.terminalSessions.set(task.id, task);
        const terminal = new CLISessionImpl('CLI', CLISessionType.TERMINAL, session, this.editorEngine.error);
        this.terminalSessions.set(terminal.id, terminal);
        this.activeTerminalSessionId = task.id;
    }

    getTerminalSession(id: string) {
        return this.terminalSessions.get(id) as TerminalSession | undefined;
    }

    async index() {
        if (!this.adapter) {
            console.error('No adapter found');
            return;
        }

        const files = await this.adapter.listFilesRecursively('./', IGNORED_DIRECTORIES, [
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

    async readFile(filePath: string): Promise<string | null> {
        const normalizedPath = normalizePath(filePath);
        return await this.fileSync.readOrFetch(normalizedPath, async () => {
            return await this.adapter?.readFile(normalizedPath) || null;
        });
    }

    async writeFile(filePath: string, fileContent: string): Promise<boolean> {
        const normalizedPath = normalizePath(filePath);
        try {
            const result = await this.adapter?.writeFile(normalizedPath, fileContent);
            if (result) {
                await this.fileSync.updateCache(normalizedPath, fileContent);
            }
            return result || false;
        } catch (error) {
            console.error(`Error writing file ${normalizedPath}:`, error);
            return false;
        }
    }

    async readBinaryFile(path: string): Promise<Uint8Array | null> {
        const normalizedPath = normalizePath(path);
        return await this.adapter?.readBinaryFile(normalizedPath) || null;
    }

    async writeBinaryFile(path: string, content: Uint8Array): Promise<boolean> {
        const normalizedPath = normalizePath(path);
        return await this.adapter?.writeBinaryFile(normalizedPath, content) || false;
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

    listAllFiles() {
        return this.fileSync.listAllFiles();
    }

    async listFiles(dir: string) {
        return await this.adapter?.listFiles(dir) || [];
    }

    async listFilesRecursively(
        dir: string,
        ignore: string[] = [],
        extensions: string[] = [],
    ): Promise<string[]> {
        return await this.adapter?.listFilesRecursively(dir, ignore, extensions) || [];
    }

    async downloadFiles(projectName?: string): Promise<{ downloadUrl: string; fileName: string } | null> {
        return await this.adapter?.downloadFiles(projectName) || null;
    }

    async watchFiles() {
        if (!this.adapter) {
            console.error('No adapter found');
            return;
        }

        await this.adapter.watchFiles(this.handleFileChange.bind(this), IGNORED_DIRECTORIES);
    }

    async handleFileChange(event: WatchEvent) {
        for (const path of event.paths) {
            const normalizedPath = normalizePath(path);
            
            if (event.type === 'remove') {
                this.fileSync.delete(normalizedPath);
                continue;
            }

            if (event.type === 'add' || event.type === 'change') {
                const content = await this.readFile(normalizedPath);
                if (content !== null) {
                    await this.processFileForMapping(normalizedPath);
                }
            }
        }
    }

    async processFileForMapping(file: string) {
        const content = await this.readFile(file);
        if (content === null) {
            return;
        }

        try {
            await this.templateNodeMap.processFileForMapping(
                file,
                this.readFile.bind(this),
                this.writeFile.bind(this)
            );
        } catch (error) {
            console.error(`Error processing file for mapping ${file}:`, error);
        }
    }

    async getTemplateNode(oid: string): Promise<TemplateNode | null> {
        return this.templateNodeMap.getTemplateNode(oid);
    }

    async getCodeBlock(oid: string): Promise<string | null> {
        const templateNode = await this.getTemplateNode(oid);
        if (!templateNode) {
            return null;
        }

        try {
            const content = await this.readFile(templateNode.path);
            if (!content) {
                return null;
            }
            return getContentFromTemplateNode(templateNode, content);
        } catch (error) {
            console.error(`Error getting code block for OID ${oid}:`, error);
            return null;
        }
    }

    async runCommand(command: string, streamCallback: (output: string) => void): Promise<{
        output: string;
        success: boolean;
        error: string | null;
    }> {
        return await this.adapter?.runCommand(command, streamCallback) || {
            output: '',
            success: false,
            error: 'No adapter available'
        };
    }

    get isConnecting() {
        return this.adapter?.isConnecting || false;
    }

    get session() {
        return this.adapter?.session || null;
    }

    async hibernate(sandboxId: string) {
        await this.adapter?.hibernate(sandboxId);
    }

    async disconnect() {
        await this.adapter?.disconnect();
        // Clear terminal sessions
        this.terminalSessions.forEach(terminal => {
            if (terminal.type === 'terminal') {
                terminal.terminal?.kill();
                terminal.xterm?.dispose();
            }
        });
        this.terminalSessions.clear();
    }

    clear() {
        this.adapter?.clear();
        this.adapter = null;
        this.fileSync.clear();
        this.templateNodeMap.clear();
        // Clear terminal sessions
        this.terminalSessions.forEach(terminal => {
            if (terminal.type === 'terminal') {
                terminal.terminal?.kill();
                terminal.xterm?.dispose();
            }
        });
        this.terminalSessions.clear();
    }
}
