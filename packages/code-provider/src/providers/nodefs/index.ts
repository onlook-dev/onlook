import {
    Provider,
    ProviderBackgroundCommand,
    ProviderFileWatcher,
    ProviderTask,
    ProviderTerminal,
    type CopyFileOutput,
    type CopyFilesInput,
    type CreateDirectoryInput,
    type CreateDirectoryOutput,
    type CreateProjectInput,
    type CreateProjectOutput,
    type CreateSessionInput,
    type CreateSessionOutput,
    type CreateTerminalInput,
    type CreateTerminalOutput,
    type DeleteFilesInput,
    type DeleteFilesOutput,
    type DownloadFilesInput,
    type DownloadFilesOutput,
    type GetTaskInput,
    type GetTaskOutput,
    type GitStatusInput,
    type GitStatusOutput,
    type InitializeInput,
    type InitializeOutput,
    type ListFilesInput,
    type ListFilesOutput,
    type ListProjectsInput,
    type ListProjectsOutput,
    type PauseProjectInput,
    type PauseProjectOutput,
    type ReadFileInput,
    type ReadFileOutput,
    type RenameFileInput,
    type RenameFileOutput,
    type SetupInput,
    type SetupOutput,
    type StatFileInput,
    type StatFileOutput,
    type StopProjectInput,
    type StopProjectOutput,
    type TerminalBackgroundCommandInput,
    type TerminalBackgroundCommandOutput,
    type TerminalCommandInput,
    type TerminalCommandOutput,
    type WatchEvent,
    type WatchFilesInput,
    type WatchFilesOutput,
    type WriteFileInput,
    type WriteFileOutput,
} from '../../types';

export interface NodeFsProviderOptions {}

export class NodeFsProvider extends Provider {
    private readonly options: NodeFsProviderOptions;

    constructor(options: NodeFsProviderOptions) {
        super();
        this.options = options;
    }

    async initialize(input: InitializeInput): Promise<InitializeOutput> {
        return {};
    }

    async writeFile(input: WriteFileInput): Promise<WriteFileOutput> {
        return {
            success: true,
        };
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

    async readFile(input: ReadFileInput): Promise<ReadFileOutput> {
        return {
            file: {
                path: input.args.path,
                content: '',
                type: 'text',
                toString: () => {
                    return '';
                },
            },
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

    async createDirectory(input: CreateDirectoryInput): Promise<CreateDirectoryOutput> {
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

    async setup(input: SetupInput): Promise<SetupOutput> {
        return {};
    }

    async createSession(input: CreateSessionInput): Promise<CreateSessionOutput> {
        return {};
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

    static async createProject(input: CreateProjectInput): Promise<CreateProjectOutput> {
        return {
            id: input.id,
        };
    }

    static async createProjectFromGit(input: {
        repoUrl: string;
        branch: string;
    }): Promise<CreateProjectOutput> {
        throw new Error('createProjectFromGit not implemented for NodeFs provider');
    }

    async pauseProject(input: PauseProjectInput): Promise<PauseProjectOutput> {
        return {};
    }

    async stopProject(input: StopProjectInput): Promise<StopProjectOutput> {
        return {};
    }

    async listProjects(input: ListProjectsInput): Promise<ListProjectsOutput> {
        return {};
    }

    async destroy(): Promise<void> {
        // TODO: Implement
    }
}

export class NodeFsFileWatcher extends ProviderFileWatcher {
    start(input: WatchFilesInput): Promise<void> {
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
