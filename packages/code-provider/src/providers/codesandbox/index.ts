import {
    CodeSandbox,
    Command,
    Sandbox,
    Task,
    Terminal,
    WebSocketSession,
    type SandboxBrowserSession,
    type Watcher,
} from '@codesandbox/sdk';
import {
    Provider,
    type TerminalCommandInput,
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
    type CreateTerminalInput,
    type CreateTerminalOutput,
    ProviderTerminal,
    type ProviderTerminalShellSize,
    type GetTaskInput,
    type GetTaskOutput,
    ProviderTask,
    type TerminalCommandOutput,
    type TerminalBackgroundCommandInput,
    type TerminalBackgroundCommandOutput,
    ProviderBackgroundCommand,
    type GitStatusInput,
    type GitStatusOutput,
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
        return createFile(this.client, input);
    }

    async editFile(input: EditFileInput): Promise<EditFileOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        return editFile(this.client, input);
    }

    async renameFile(input: RenameFileInput): Promise<RenameFileOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        await this.client.fs.rename(input.args.oldPath, input.args.newPath);
        return {};
    }

    async statFile(input: StatFileInput): Promise<StatFileOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        const res = await this.client.fs.stat(input.args.path);
        return {
            type: res.type,
            isSymlink: res.isSymlink,
            size: res.size,
            mtime: res.mtime,
            ctime: res.ctime,
            atime: res.atime,
        };
    }

    async deleteFiles(input: DeleteFilesInput): Promise<DeleteFilesOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        await this.client.fs.remove(input.args.path, input.args.recursive);
        return {};
    }

    async listFiles(input: ListFilesInput): Promise<ListFilesOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        return listFiles(this.client, input);
    }

    async readFiles(input: ReadFilesInput): Promise<ReadFilesOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        return readFiles(this.client, input);
    }

    async downloadFiles(input: DownloadFilesInput): Promise<DownloadFilesOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        const res = await this.client.fs.download(input.args.path);
        return {
            url: res.downloadUrl,
        };
    }

    async copyFiles(input: CopyFilesInput): Promise<CopyFileOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
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
        const watcher = new CodesandboxFileWatcher(this.client);

        await watcher.start(input);

        await this.client.fs.watch(input.args.path, {
            recursive: input.args.recursive,
            excludes: input.args.excludes,
        });

        if (input.onFileChange) {
            watcher.registerEventCallback(async (event) => {
                if (input.onFileChange) {
                    await input.onFileChange({
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

    async createTerminal(input: CreateTerminalInput): Promise<CreateTerminalOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        const csTerminal = await this.client.terminals.create();
        return {
            terminal: new CodesandboxTerminal(csTerminal),
        };
    }

    async getTask(input: GetTaskInput): Promise<GetTaskOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        const task = this.client.tasks.get(input.args.id);
        if (!task) {
            throw new Error(`Task ${input.args.id} not found`);
        }
        return {
            task: new CodesandboxTask(task),
        };
    }

    async runCommand({ args }: TerminalCommandInput): Promise<TerminalCommandOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        const output = await this.client.commands.run(args.command);
        return {
            output,
        };
    }

    async runBackgroundCommand(
        input: TerminalBackgroundCommandInput,
    ): Promise<TerminalBackgroundCommandOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        const command = await this.client.commands.runBackground(input.args.command);
        return {
            command: new CodesandboxBackgroundCommand(command),
        };
    }

    async gitStatus(input: GitStatusInput): Promise<GitStatusOutput> {
        if (!this.client) {
            throw new Error('Client not initialized');
        }
        const status = await this.client.git.status();
        return {
            changedFiles: status.changedFiles,
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

export class CodesandboxTerminal extends ProviderTerminal {
    constructor(private readonly _terminal: Terminal) {
        super();
    }

    get id(): string {
        return this._terminal.id;
    }

    get name(): string {
        return this._terminal.name;
    }

    open(dimensions?: ProviderTerminalShellSize): Promise<string> {
        return this._terminal.open(dimensions);
    }

    write(input: string, dimensions?: ProviderTerminalShellSize): Promise<void> {
        return this._terminal.write(input, dimensions);
    }

    run(input: string, dimensions?: ProviderTerminalShellSize): Promise<void> {
        return this._terminal.run(input, dimensions);
    }

    kill(): Promise<void> {
        return this._terminal.kill();
    }

    onOutput(callback: (data: string) => void): () => void {
        const disposable = this._terminal.onOutput(callback);
        return () => {
            disposable.dispose();
        };
    }
}

export class CodesandboxTask extends ProviderTask {
    constructor(private readonly _task: Task) {
        super();
    }

    get id(): string {
        return this._task.id;
    }

    get name(): string {
        return this._task.name;
    }

    get command(): string {
        return this._task.command;
    }

    open(): Promise<string> {
        return this._task.open();
    }

    run(): Promise<void> {
        return this._task.run();
    }

    restart(): Promise<void> {
        return this._task.restart();
    }

    stop(): Promise<void> {
        return this._task.stop();
    }

    onOutput(callback: (data: string) => void): () => void {
        const disposable = this._task.onOutput(callback);
        return () => {
            disposable.dispose();
        };
    }
}

export class CodesandboxBackgroundCommand extends ProviderBackgroundCommand {
    constructor(private readonly _command: Command) {
        super();
    }

    get name(): string | undefined {
        return this._command.name;
    }

    get command(): string {
        return this._command.command;
    }

    open(): Promise<string> {
        return this._command.open();
    }

    restart(): Promise<void> {
        return this._command.restart();
    }

    kill(): Promise<void> {
        return this._command.kill();
    }

    onOutput(callback: (data: string) => void): () => void {
        const disposable = this._command.onOutput(callback);
        return () => {
            disposable.dispose();
        };
    }
}
