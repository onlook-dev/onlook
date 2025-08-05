import {
    Provider,
    ProviderBackgroundCommand,
    ProviderFileWatcher,
    ProviderTask,
    ProviderTerminal,
    type CopyFileOutput,
    type CopyFilesInput,
    type CreateFileInput,
    type CreateFileOutput,
    type CreateTerminalInput,
    type CreateTerminalOutput,
    type DeleteFilesInput,
    type DeleteFilesOutput,
    type DownloadFilesInput,
    type DownloadFilesOutput,
    type EditFileInput,
    type EditFileOutput,
    type GetTaskInput,
    type GetTaskOutput,
    type GitStatusInput,
    type GitStatusOutput,
    type ListFilesInput,
    type ListFilesOutput,
    type ReadFilesInput,
    type ReadFilesOutput,
    type RenameFileInput,
    type RenameFileOutput,
    type StatFileInput,
    type StatFileOutput,
    type TerminalBackgroundCommandInput,
    type TerminalBackgroundCommandOutput,
    type TerminalCommandInput,
    type TerminalCommandOutput,
    type WatchEvent,
    type WatchFilesInput,
    type WatchFilesOutput,
} from '../../types';

export interface NodeFsProviderOptions {}

export class NodeFsProvider extends Provider {
    private readonly options: NodeFsProviderOptions;

    constructor(options: NodeFsProviderOptions) {
        super();
        this.options = options;
    }

    async initialize(): Promise<void> {
        // TODO: Implement
    }

    async createFile(input: CreateFileInput): Promise<CreateFileOutput> {
        return {};
    }

    async editFile(input: EditFileInput): Promise<EditFileOutput> {
        return {};
    }

    async renameFile(input: RenameFileInput): Promise<RenameFileOutput> {
        return {};
    }

    async statFile(input: StatFileInput): Promise<StatFileOutput> {
        return {
            type: 'file',
        };
    }

    async deleteFiles(input: DeleteFilesInput): Promise<DeleteFilesOutput> {
        return {};
    }

    async listFiles(input: ListFilesInput): Promise<ListFilesOutput> {
        return {
            files: [],
        };
    }

    async readFiles(input: ReadFilesInput): Promise<ReadFilesOutput> {
        return {
            files: [],
        };
    }

    async downloadFiles(input: DownloadFilesInput): Promise<DownloadFilesOutput> {
        return {
            url: '',
        };
    }

    async copyFiles(input: CopyFilesInput): Promise<CopyFileOutput> {
        return {};
    }

    async watchFiles(input: WatchFilesInput): Promise<WatchFilesOutput> {
        return {
            watcher: new NodeFsFileWatcher(),
        };
    }

    async createTerminal(input: CreateTerminalInput): Promise<CreateTerminalOutput> {
        return {
            terminal: new NodeFsTerminal(),
        };
    }

    async getTask(input: GetTaskInput): Promise<GetTaskOutput> {
        return {
            task: new NodeFsTask(),
        };
    }

    async runCommand(input: TerminalCommandInput): Promise<TerminalCommandOutput> {
        return {
            output: '',
        };
    }

    async runBackgroundCommand(
        input: TerminalBackgroundCommandInput,
    ): Promise<TerminalBackgroundCommandOutput> {
        return {
            command: new NodeFsCommand(),
        };
    }

    async gitStatus(input: GitStatusInput): Promise<GitStatusOutput> {
        return {
            changedFiles: [],
        };
    }

    async reload(): Promise<boolean> {
        // TODO: Implement
        return true;
    }

    async reconnect(): Promise<void> {
        // TODO: Implement
    }

    async ping(): Promise<boolean> {
        return true;
    }

    async destroy(): Promise<void> {
        // TODO: Implement
    }
}

export class NodeFsFileWatcher extends ProviderFileWatcher {
    start(): Promise<void> {
        return Promise.resolve();
    }

    stop(): Promise<void> {
        return Promise.resolve();
    }

    registerEventCallback(callback: (event: WatchEvent) => Promise<void>): void {
        // TODO: Implement
    }
}

export class NodeFsTerminal extends ProviderTerminal {
    get id(): string {
        return 'unimplemented';
    }

    get name(): string {
        return 'unimplemented';
    }

    open(): Promise<string> {
        return Promise.resolve('');
    }

    write(): Promise<void> {
        return Promise.resolve();
    }

    run(): Promise<void> {
        return Promise.resolve();
    }

    kill(): Promise<void> {
        return Promise.resolve();
    }

    onOutput(callback: (data: string) => void): () => void {
        return () => {};
    }
}

export class NodeFsTask extends ProviderTask {
    get id(): string {
        return 'unimplemented';
    }

    get name(): string {
        return 'unimplemented';
    }

    get command(): string {
        return 'unimplemented';
    }

    open(): Promise<string> {
        return Promise.resolve('');
    }

    run(): Promise<void> {
        return Promise.resolve();
    }

    restart(): Promise<void> {
        return Promise.resolve();
    }

    stop(): Promise<void> {
        return Promise.resolve();
    }

    onOutput(callback: (data: string) => void): () => void {
        return () => {};
    }
}

export class NodeFsCommand extends ProviderBackgroundCommand {
    get name(): string {
        return 'unimplemented';
    }

    get command(): string {
        return 'unimplemented';
    }

    open(): Promise<string> {
        return Promise.resolve('');
    }

    restart(): Promise<void> {
        return Promise.resolve();
    }

    kill(): Promise<void> {
        return Promise.resolve();
    }

    onOutput(callback: (data: string) => void): () => void {
        return () => {};
    }
}
