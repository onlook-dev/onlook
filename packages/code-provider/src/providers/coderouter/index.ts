import {
    Provider,
    ProviderBackgroundCommand,
    ProviderFileWatcher,
    ProviderTask,
    ProviderTerminal,
    type CopyFileOutput,
    type CopyFilesInput,
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
    type GetProjectUrlInput,
    type GetProjectUrlOutput,
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

import * as OpenAPI from './codegen';
import { v4 as uuid } from 'uuid';
import { fetchEventSource } from '@microsoft/fetch-event-source';

export interface CoderouterProviderOptions {
    // URL to Coderouter
    url?: string;
    // Onlook's sandbox ID
    sandboxId?: string;
    // Onlook's user ID
    userId?: string;
    getSession?: (
        provider: CoderouterProvider,
        sandboxId: string,
        userId?: string,
    ) => Promise<{ jwt?: string }>;
}

export class CoderouterProvider extends Provider {
    private readonly options: CoderouterProviderOptions;
    private jwt: string | null = null;

    private readonly api: OpenAPI.DefaultApi;

    constructor(options: CoderouterProviderOptions) {
        super();
        this.options = options;

        const configurationParameters: OpenAPI.ConfigurationParameters = {
            basePath: this.options.url || 'https://onlook.internal',
        };
        const configuration = new OpenAPI.Configuration(configurationParameters);

        // Use configuration with your_api
        this.api = new OpenAPI.DefaultApi(configuration);
    }

    async initialize(input: InitializeInput): Promise<InitializeOutput> {
        if (!this.options.sandboxId) {
            return {};
        }
        if (this.options.getSession) {
            const res = await this.options.getSession(
                this,
                this.options.sandboxId,
                this.options.userId,
            );
            this.jwt = res.jwt ?? null;
        }
        return {};
    }

    async writeFile(input: WriteFileInput): Promise<WriteFileOutput> {
        const res = await this.api.coderouterApiSandboxFileWritePost(
            {
                coderouterApiSandboxFileWritePostRequest: {
                    files: [
                        {
                            path: input.args.path,
                            data:
                                input.args.content instanceof Uint8Array
                                    ? Buffer.from(input.args.content).toString('utf-8')
                                    : input.args.content,
                            overwrite: input.args.overwrite ?? true,
                        },
                    ],
                },
            },
            this.requestInitOverrides(),
        );
        return {
            success: true,
        };
    }

    async renameFile(input: RenameFileInput): Promise<RenameFileOutput> {
        await this.api.coderouterApiSandboxFileRenamePost(
            {
                coderouterApiSandboxFileRenamePostRequest: {
                    oldPath: input.args.oldPath,
                    newPath: input.args.newPath,
                },
            },
            this.requestInitOverrides(),
        );
        return {};
    }

    async statFile(input: StatFileInput): Promise<StatFileOutput> {
        const res = await this.api.coderouterApiSandboxFileStatPost(
            {
                coderouterApiSandboxFileStatPostRequest: {
                    path: input.args.path,
                },
            },
            this.requestInitOverrides(),
        );
        return {
            type: res.type,
        };
    }

    async deleteFiles(input: DeleteFilesInput): Promise<DeleteFilesOutput> {
        await this.api.coderouterApiSandboxFileDeletePost(
            {
                coderouterApiSandboxFileDeletePostRequest: {
                    path: input.args.path,
                },
            },
            this.requestInitOverrides(),
        );
        return {};
    }

    async listFiles(input: ListFilesInput): Promise<ListFilesOutput> {
        const res = await this.api
            .coderouterApiSandboxFileListPost(
                {
                    coderouterApiSandboxFileListPostRequest: {
                        path: input.args.path,
                    },
                },
                this.requestInitOverrides(),
            )
            .catch((error: any) => {
                if (error?.response?.status === 404) {
                    return {
                        files: [],
                    };
                }
                throw error;
            });
        return {
            files: res.files.map((file) => ({
                name: file.name,
                path: file.path,
                type: file.type,
                isSymlink: false,
            })),
        };
    }

    async readFile(input: ReadFileInput): Promise<ReadFileOutput> {
        try {
            const res = await this.api.coderouterApiSandboxFileReadPost(
                {
                    coderouterApiSandboxFileReadPostRequest: {
                        path: input.args.path,
                    },
                },
                this.requestInitOverrides(),
            );
            return {
                file: {
                    path: input.args.path,
                    content: res.data,
                    type: 'text',
                    toString: () => {
                        return res.data;
                    },
                },
            };
        } catch (error: any) {
            if (error?.response?.status === 404) {
                return {
                    file: null,
                };
            }
            throw error;
        }
    }

    async downloadFiles(input: DownloadFilesInput): Promise<DownloadFilesOutput> {
        const res: any = await this.api.coderouterApiSandboxFileDownloadPost(
            {
                coderouterApiSandboxFileDownloadPostRequest: {
                    path: input.args.path,
                },
            },
            this.requestInitOverrides(),
        );
        return {
            url: res.url,
        };
    }

    async copyFiles(input: CopyFilesInput): Promise<CopyFileOutput> {
        await this.api.coderouterApiSandboxFileCopyPost(
            {
                coderouterApiSandboxFileCopyPostRequest: {
                    source: input.args.sourcePath,
                    destination: input.args.targetPath,
                    recursive: input.args.recursive ?? true,
                    overwrite: input.args.overwrite ?? true,
                },
            },
            this.requestInitOverrides(),
        );
        return {};
    }

    async watchFiles(input: WatchFilesInput): Promise<WatchFilesOutput> {
        const watcher = new CoderouterFileWatcher(this.api, () => this.requestInitOverrides());

        await watcher.start(input);

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
        const terminal = new CoderouterTerminal(this.api, () => this.requestInitOverrides());
        await terminal.start();
        return {
            terminal,
        };
    }

    async getTask(input: GetTaskInput): Promise<GetTaskOutput> {
        return {
            task: new CoderouterTask(),
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
            command: new CoderouterCommand(),
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
        // called in the backend
        const res = await this.api.coderouterApiAuthSignPost(
            {
                coderouterApiAuthSignPostRequest: {
                    sandboxId: this.options.sandboxId,
                    userId: this.options.userId,
                },
            },
            {
                headers: {
                    'content-type': 'application/json',
                    authorization: `Bearer ${process?.env?.CODEROUTER_API_KEY}`,
                },
            },
        );
        const { jwt } = res;
        return {
            jwt,
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

    async createProject(input: CreateProjectInput): Promise<CreateProjectOutput> {
        const res = await this.api.coderouterApiSandboxCreatePost(
            {
                coderouterApiSandboxCreatePostRequest: {
                    templateId: input.templateId ?? 'default',
                    metadata: {},
                },
            },
            this.requestInitOverrides(),
        );
        return {
            id: input.id,
        };
    }

    async pauseProject(input: PauseProjectInput): Promise<PauseProjectOutput> {
        return {};
    }

    async stopProject(input: StopProjectInput): Promise<StopProjectOutput> {
        return {};
    }

    async listProjects(input: ListProjectsInput): Promise<ListProjectsOutput> {
        return { projects: [] };
    }

    async getProjectUrl(input: GetProjectUrlInput): Promise<GetProjectUrlOutput> {
        const res = await this.api.coderouterApiSandboxUrlPost(this.requestInitOverrides());
        return {
            url: res.url,
        };
    }

    async destroy(): Promise<void> {
        // TODO: Implement
    }

    private requestInitOverrides() {
        return {
            headers: {
                'content-type': 'application/json',
                'X-Auth-Jwt': this.jwt ?? '',
            },
        };
    }
}

export class CoderouterFileWatcher extends ProviderFileWatcher {
    protected callbacks: Array<(event: WatchEvent) => Promise<void>> = [];
    protected abortController: AbortController | null = null;

    constructor(
        private readonly api: OpenAPI.DefaultApi,
        private readonly requestInitOverrides: () => RequestInit,
    ) {
        super();
    }

    protected off = true;
    async start(input: WatchFilesInput): Promise<void> {
        if (!this.off) {
            return;
        }

        this.off = false;

        const tick = async () => {
            if (this.off) {
                return;
            }

            if (this.abortController) {
                this.abortController.abort();
            }

            this.abortController = new AbortController();

            try {
                const body = await this.api.coderouterApiSandboxFileWatchPost(
                    {
                        coderouterApiSandboxFileWatchPostRequest: {
                            path: input.args.path,
                            recursive: input.args.recursive ?? true,
                            excludePaths: input.args.excludes ?? [],
                        },
                    },
                    {
                        ...this.requestInitOverrides(),
                        signal: this.abortController?.signal,
                    },
                );

                // convert the events to a map of type to paths as the defined by the product
                const events = body.events.reduce(
                    (acc, event) => {
                        acc[event.type] = [...(acc[event.type] || []), event.path];
                        return acc;
                    },
                    {} as Record<string, string[]>,
                );

                for (const [type, paths] of Object.entries(events)) {
                    this.callbacks.forEach(async (callback) => {
                        await callback({
                            type:
                                type === 'create' ? 'add' : type === 'delete' ? 'remove' : 'change',
                            paths,
                        });
                    });
                }
            } catch (err) {
                console.error('[coderouter] poll error', err);
            } finally {
                // schedule next poll immediately
                setTimeout(tick, 200);
            }
        };

        tick();
    }

    async stop(): Promise<void> {
        this.off = true;
    }

    registerEventCallback(callback: (event: WatchEvent) => Promise<void>): void {
        this.callbacks.push(callback);
    }
}

export class CoderouterTerminal extends ProviderTerminal {
    protected _id: string;
    protected callbacks: Array<(output: string) => void> = [];
    protected abortController: AbortController | null = null;

    constructor(
        private readonly api: OpenAPI.DefaultApi,
        private readonly requestInitOverrides: () => RequestInit,
    ) {
        super();
        this._id = uuid();
    }

    get id(): string {
        return this._id;
    }

    get name(): string {
        return this._id;
    }

    protected off = true;

    async start(): Promise<void> {
        if (!this.off) {
            return;
        }

        this.off = false;

        await this.api.coderouterApiSandboxTerminalCreatePost(
            {
                coderouterApiSandboxTerminalCreatePostRequest: {
                    terminalId: this._id,
                    name: this._id,
                },
            },
            this.requestInitOverrides(),
        );
    }

    async open(dimensions?: object): Promise<string> {
        if (this.off) {
            return '';
        }

        fetchEventSource(
            `${this.api['configuration'].basePath}/coderouter/api/sandbox/terminal/open?terminalId=${this._id}`,
            {
                ...(this.requestInitOverrides() as Record<string, any>),
                onmessage: (event) => {
                    if (event.event === 'message') {
                        const res = JSON.parse(event.data);
                        console.log('res', res);
                        this.callbacks.forEach((callback) => callback(res.output));
                    }
                },
                onerror: (err) => {
                    console.error('[coderouter/terminal/open] SSE error', err);
                },
            },
        );

        // this.off = false;

        // const tick = async () => {
        //     if (this.off) {
        //         return '';
        //     }

        //     if (this.abortController) {
        //         this.abortController.abort();
        //     }

        //     this.abortController = new AbortController();

        //     let output = '';
        //     try {
        //         const body = await this.api.coderouterApiSandboxTerminalOpenGet(
        //             {
        //                 terminalId: this._id,
        //             },
        //             {
        //                 ...this.requestInitOverrides(),
        //                 signal: this.abortController?.signal,
        //             },
        //         );

        //         this.callbacks.forEach((callback) => {
        //             callback(body.output);
        //         });

        //         output = body.output;
        //     } catch (err) {
        //         console.error('[coderouter] poll error', err);
        //     } finally {
        //         // schedule next poll immediately
        //         setTimeout(tick, 200);
        //     }
        //     return output;
        // };

        // tick();
        return '';
    }

    async write(input: string, dimensions?: object): Promise<void> {
        await this.api.coderouterApiSandboxTerminalWritePost(
            {
                coderouterApiSandboxTerminalWritePostRequest: {
                    terminalId: this._id,
                    input,
                },
            },
            this.requestInitOverrides(),
        );
    }

    async run(input: string, dimensions?: object): Promise<void> {
        await this.api.coderouterApiSandboxTerminalRunPost(
            {
                coderouterApiSandboxTerminalRunPostRequest: {
                    terminalId: this._id,
                    input,
                },
            },
            this.requestInitOverrides(),
        );
    }

    async kill(): Promise<void> {
        await this.api.coderouterApiSandboxTerminalKillPost(
            {
                coderouterApiSandboxTerminalKillPostRequest: {
                    terminalId: this._id,
                },
            },
            this.requestInitOverrides(),
        );
    }

    onOutput(callback: (data: string) => void): () => void {
        this.callbacks.push(callback);
        return () => null;
    }
}

export class CoderouterTask extends ProviderTask {
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

export class CoderouterCommand extends ProviderBackgroundCommand {
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
