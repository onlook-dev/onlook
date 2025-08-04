import {
    CodeSandbox,
    Sandbox,
    WebSocketSession,
    type SandboxBrowserSession,
    type Watcher,
} from '@codesandbox/sdk';
import {
    Provider,
    type TerminalCommandInput,
    type TerminalCommandOutputs,
    type CreateFileInput,
    type CreateFileOutput,
    type DeleteFilesInput,
    type DeleteFilesOutput,
    type EditFileInput,
    type EditFileOutput,
    type ListFilesInput,
    type ListFilesOutput,
    type ReadFilesInput,
    type ReadFilesOutput,
    type DownloadFilesInput,
    type DownloadFilesOutput,
    type CopyFilesInput,
    type CopyFileOutput,
    type RenameFileInput,
    type RenameFileOutput,
    type WatchFilesInput,
    type WatchFilesOutput,
    type WatchEvent,
    ProviderFileWatcher,
    type StatFileInput,
    type StatFileOutput,
} from '../../types';
import { createFile } from './utils/create-file';
import { editFile } from './utils/edit-file';
import { listFiles } from './utils/list-files';
import { readFiles } from './utils/read-files';
import { connectToSandbox } from '@codesandbox/sdk/browser';

export interface CodesandboxProviderOptions {
    sandboxId: string;
    userId?: string;
    // returns a session object used by codesandbox SDK
    // only populate this property in the browser
    getSession?: (sandboxId: string, userId?: string) => Promise<SandboxBrowserSession | null>;
}

export class CodesandboxProvider extends Provider {
    private readonly options: CodesandboxProviderOptions;

    private sandbox: Sandbox | null = null;
    private _client: WebSocketSession | null = null;

    constructor(options: CodesandboxProviderOptions) {
        super();
        this.options = options;
    }

    // may be removed in the future once the code completely interfaces through the provider
    get client() {
        return this._client;
    }

    async initialize(): Promise<void> {
        if (this.options.getSession) {
            const session = await this.options.getSession(
                this.options.sandboxId,
                this.options.userId,
            );
            this._client = await connectToSandbox({
                session,
                getSession: async (id) =>
                    (await this.options.getSession?.(id, this.options.userId)) || null,
            });
            this._client.keepActiveWhileConnected(true);
        } else {
            // backend path, use environment variables
            const sdk = new CodeSandbox();
            this.sandbox = await sdk.sandboxes.resume(this.options.sandboxId);
            this._client = await this.sandbox.connect();
        }
    }

    async reload(): Promise<boolean> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        const task = await this.client?.tasks.get('dev');
        if (task) {
            await task.restart();
            return true;
        }
        return false;
    }

    async reconnect(): Promise<void> {
        // TODO: Implement
    }

    async ping(): Promise<boolean> {
        try {
            await this.client?.commands.run('echo "ping"');
            return true;
        } catch (error) {
            console.error('Failed to ping sandbox', error);
            return false;
        }
    }

    async destroy(): Promise<void> {
        await this.client?.disconnect();
        this._client = null;
        this.sandbox = null;
    }

    async createFile(input: CreateFileInput): Promise<CreateFileOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        console.log('createFile ===>', input);
        return createFile(this.client, input);
    }

    async editFile(input: EditFileInput): Promise<EditFileOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        console.log('editFile ===>', input);
        return editFile(this.client, input);
    }

    async renameFile(input: RenameFileInput): Promise<RenameFileOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        console.log('renameFile ===>', input);
        await this.client.fs.rename(input.args.oldPath, input.args.newPath);
        return {};
    }

    async statFile(input: StatFileInput): Promise<StatFileOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        console.log('statFile ===>', input);
        const res = await this.client.fs.stat(input.args.path);
        return {
            type: res.type,
        };
    }

    async deleteFiles(input: DeleteFilesInput): Promise<DeleteFilesOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        console.log('deleteFiles ===>', input);
        await this.client.fs.remove(input.args.path, input.args.recursive);
        return {};
    }

    async listFiles(input: ListFilesInput): Promise<ListFilesOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        console.log('listFiles ===>', input);
        return listFiles(this.client, input);
    }

    async readFiles(input: ReadFilesInput): Promise<ReadFilesOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        console.log('readFiles ===>', input);
        return readFiles(this.client, input);
    }

    async runTerminalCommand({ args }: TerminalCommandInput): Promise<TerminalCommandOutputs> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        console.log('runTerminalCommand ===>', args);
        const output = await this.client.commands.run(args.command);
        return {
            output,
        };
    }

    async downloadFiles(input: DownloadFilesInput): Promise<DownloadFilesOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        console.log('downloadFiles ===>', input);
        const res = await this.client.fs.download(input.args.path);
        return {
            url: res.downloadUrl,
        };
    }

    async copyFiles(input: CopyFilesInput): Promise<CopyFileOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        console.log('copyFiles ===>', input);
        await this.client.fs.copy(
            input.args.sourcePath,
            input.args.targetPath,
            input.args.recursive,
            input.args.overwrite,
        );
        return {};
    }

    async watchFiles(input: WatchFilesInput): Promise<WatchFilesOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        console.log('watchFiles ===>', input);
        const watcher = new CodesandboxFileWatcher(this.client);

        await watcher.start(input);

        await this.client.fs.watch(input.args.path, {
            recursive: input.args.recursive,
            excludes: input.args.excludes,
        });

        if (input.args.onFileChange) {
            watcher.registerEventCallback(async (event) => {
                console.log('watchFiles onFileChange ===>', event);
                if (input.args.onFileChange) {
                    await input.args.onFileChange({
                        type: event.type,
                        paths: event.paths,
                    });
                }
            });
        }

        return {
            watcher,
        };
    }
}

export class CodesandboxFileWatcher extends ProviderFileWatcher {
    private watcher: Watcher | null = null;

    constructor(private readonly client: WebSocketSession) {
        super();
    }

    async start(input: WatchFilesInput): Promise<void> {
        this.watcher = await this.client.fs.watch(input.args.path, {
            recursive: input.args.recursive,
            excludes: input.args.excludes || [],
        });
    }

    registerEventCallback(callback: (event: WatchEvent) => Promise<void>): void {
        if (!this.watcher) {
            throw new Error('Watcher not initialized');
        }
        this.watcher.onEvent(callback);
    }

    async stop(): Promise<void> {
        if (!this.watcher) {
            throw new Error('Watcher not initialized');
        }
        this.watcher.dispose();
        this.watcher = null;
    }
}
