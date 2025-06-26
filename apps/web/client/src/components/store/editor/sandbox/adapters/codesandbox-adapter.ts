import type { SandboxAdapter, WatchEvent } from './interface';
import type { EditorEngine } from '../../engine';
import { CodeSandboxProvider } from '../providers/codesandbox';
import { SandboxProviderType } from '../providers/interface';
import { FileWatcher } from '../file-watcher';
import { normalizePath } from '../helpers';

export class CodeSandboxAdapter implements SandboxAdapter {
    readonly providerType = SandboxProviderType.CODESANDBOX;
    
    private _session: any = null;
    private fileWatcher: FileWatcher | null = null;
    private provider: CodeSandboxProvider;
    private _isConnecting = false;
    
    constructor(
        private readonly editorEngine: EditorEngine,
        private readonly apiKey: string
    ) {
        this.provider = new CodeSandboxProvider(apiKey);
    }
    
    get isConnecting() {
        return this._isConnecting;
    }
    
    get session() {
        return this._session;
    }
    
    async start(sandboxId: string, userId: string) {
        this._isConnecting = true;
        try {
            this._session = await this.provider.start(sandboxId, userId);
            return this._session;
        } finally {
            this._isConnecting = false;
        }
    }
    
    async hibernate(sandboxId: string) {
        await this.provider.hibernate(sandboxId);
    }
    
    async disconnect() {
        if (this._session) {
            await this._session.disconnect();
            this._session = null;
        }
        this.stopWatching();
    }
    
    async readFile(path: string): Promise<string | null> {
        if (!this._session) {
            console.error('No session found for remote read');
            return null;
        }
        
        try {
            return await this._session.fs.readTextFile(path);
        } catch (error) {
            console.error(`Error reading remote file ${path}:`, error);
            return null;
        }
    }
    
    async writeFile(path: string, content: string): Promise<boolean> {
        if (!this._session) {
            console.error('No session found for remote write');
            return false;
        }
        
        try {
            await this._session.fs.writeTextFile(path, content);
            return true;
        } catch (error) {
            console.error(`Error writing remote file ${path}:`, error);
            return false;
        }
    }
    
    async readBinaryFile(path: string): Promise<Uint8Array | null> {
        if (!this._session) {
            console.error('No session found for remote binary read');
            return null;
        }
        
        try {
            return await this._session.fs.readFile(path);
        } catch (error) {
            console.error(`Error reading remote binary file ${path}:`, error);
            return null;
        }
    }
    
    async writeBinaryFile(path: string, content: Uint8Array): Promise<boolean> {
        if (!this._session) {
            console.error('No session found for remote binary write');
            return false;
        }
        
        try {
            await this._session.fs.writeFile(path, content);
            return true;
        } catch (error) {
            console.error(`Error writing remote binary file ${path}:`, error);
            return false;
        }
    }
    
    async listFiles(dir: string) {
        if (!this._session) {
            console.error('No session found');
            return [];
        }
        return this._session.fs.readdir(dir);
    }
    
    async listFilesRecursively(
        dir: string,
        ignore: string[] = [],
        extensions: string[] = [],
    ): Promise<string[]> {
        if (!this._session) {
            console.error('No session found');
            return [];
        }

        const results: string[] = [];
        const entries = await this._session.fs.readdir(dir);

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
            } else if (entry.type === 'file') {
                const extension = entry.name.split('.').pop()?.toLowerCase();
                if (extensions.length === 0 || (extension && extensions.includes(extension))) {
                    results.push(normalizedPath);
                }
            }
        }

        return results;
    }
    
    async watchFiles(onFileChange: (event: WatchEvent) => Promise<void>, excludePatterns: string[]): Promise<void> {
        if (!this._session) {
            console.error('No session found');
            return;
        }

        try {
            this.fileWatcher = new FileWatcher({
                session: this._session,
                onFileChange: async (event: WatchEvent) => await onFileChange(event),
                excludePatterns,
                fileEventBus: this.editorEngine.sandbox.fileEventBus,
            });

            await this.fileWatcher.start();
        } catch (error) {
            console.error('Failed to start file watcher:', error);
        }
    }
    
    stopWatching() {
        this.fileWatcher?.dispose();
        this.fileWatcher = null;
    }
    
    async downloadFiles(projectName?: string): Promise<{ downloadUrl: string; fileName: string } | null> {
        if (!this._session) {
            console.error('No sandbox session found');
            return null;
        }
        try {
            const { downloadUrl } = await this._session.fs.download('./');
            return {
                downloadUrl,
                fileName: `${projectName || 'onlook-project'}-${Date.now()}.zip`
            };
        } catch (error) {
            console.error('Error generating download URL:', error);
            return null;
        }
    }
    
    async runCommand(command: string, streamCallback: (output: string) => void): Promise<{
        output: string;
        success: boolean;
        error: string | null;
    }> {
        try {
            if (!this._session) {
                throw new Error('No session found');
            }

            const cmd = await this._session.commands.runBackground(command, {
                name: 'user command'
            });

            await cmd.open();
            const disposer = cmd.onOutput((output:any) => {
                streamCallback(output);
            });

            const finalOutput = await cmd.waitUntilComplete();

            disposer.dispose();
            return {
                output: finalOutput,
                success: true,
                error: null
            };
        } catch (error) {
            console.error('Error running command:', error);
            return {
                output: '',
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            };
        }
    }
    
    clear() {
        this.stopWatching();
        this.disconnect();
    }
} 