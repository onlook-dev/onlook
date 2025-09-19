import { ClientError, ClientErrorCode } from '@/provider/definition';
import { CodesandboxClient } from '../..';
import {
    SandboxFile,
    SandboxFileCopyInput,
    SandboxFileCopyOutput,
    SandboxFileDeleteInput,
    SandboxFileDeleteOutput,
    SandboxFileDownloadInput,
    SandboxFileDownloadOutput,
    SandboxFileListInput,
    SandboxFileListOutput,
    SandboxFileReadInput,
    SandboxFileReadOutput,
    SandboxFileRenameInput,
    SandboxFileRenameOutput,
    SandboxFileStatInput,
    SandboxFileStatOutput,
    SandboxFileWriteOutput,
    SandboxFileWriteInput,
    SandboxFileWatchInput,
    SandboxFileWatchOutput,
} from '../../../definition/sandbox/file';
import { Watcher as CodesandboxWatcher } from '@codesandbox/sdk';
// import { NotFoundError, WatchHandle } from '@e2b/code-interpreter';
import path from 'path';
import { v4 as uuid } from 'uuid';

const watchers: Map<string, Watcher> = new Map();

export class CodesandboxSandboxFile extends SandboxFile<CodesandboxClient> {
    // the folder to store the files in the sandbox
    // when creating a new template, the code must be stored in this folder
    protected folder: string = '/code';

    constructor(client: CodesandboxClient) {
        super(client);
    }

    async copy(input: SandboxFileCopyInput): Promise<SandboxFileCopyOutput> {
        throw new ClientError(ClientErrorCode.Unimplemented, 'Not implemented', false);
    }

    async delete(input: SandboxFileDeleteInput): Promise<SandboxFileDeleteOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        const client = await this.client._sandbox.connect();
        await client.fs.remove(this.fullpath(input.path));
        return {};
    }

    async download(input: SandboxFileDownloadInput): Promise<SandboxFileDownloadOutput> {
        throw new ClientError(ClientErrorCode.Unimplemented, 'Not implemented', false);
    }

    async list(input: SandboxFileListInput): Promise<SandboxFileListOutput> {
        if (!this.client._client) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Client is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        const client = this.client._client;
        const res = await client.fs.readDir({ path: this.fullpath(input.path) });
        return {
            files:
                res.data?.result?.entries.map((file) => ({
                    name: file.name,
                    path: file.name.replace(this.folder, ''),
                    type: file.type === 'file' ? 'file' : 'directory',
                })) || [],
        };
    }

    async read(input: SandboxFileReadInput): Promise<SandboxFileReadOutput> {
        if (!this.client._client) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Client is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        const client = this.client._client;
        const data = await client.fs.readFile({ path: this.fullpath(input.path) });
        if (!data) {
            throw new ClientError(ClientErrorCode.FileNotFound, 'File not found', false);
        }

        const content = data.data?.result?.content;
        if (!content) {
            throw new ClientError(ClientErrorCode.FileNotFound, 'File content not found', false);
        }

        // Convert Blob or File to string
        const contentString = await content.text();

        return {
            data: contentString,
        };
    }

    async rename(input: SandboxFileRenameInput): Promise<SandboxFileRenameOutput> {
        if (!this.client._client) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Client is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        const client = this.client._client;
        await client.fs.rename({
            from: this.fullpath(input.oldPath),
            to: this.fullpath(input.newPath),
        });
        return {};
    }

    async stat(input: SandboxFileStatInput): Promise<SandboxFileStatOutput> {
        if (!this.client._client) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Client is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        const client = this.client._client;
        const response = await client.fs.stat({ path: this.fullpath(input.path) });
        if (!response.data?.result) {
            throw new ClientError(ClientErrorCode.FileNotFound, 'File not found', false);
        }
        return {
            type: response.data.result.type === 'file' ? 'file' : 'directory',
        };
    }

    async write(input: SandboxFileWriteInput): Promise<SandboxFileWriteOutput> {
        if (!this.client._client) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Client is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        const client = this.client._client;
        for (const file of Array.isArray(input.files) ? input.files : [input.files]) {
            if (!file.overwrite) {
                const exists = await this.stat({ path: this.fullpath(file.path) });
                if (exists) {
                    continue;
                }
            }
            await client.fs.writeFile({
                path: this.fullpath(file.path),
                content: new Blob([file.data], { type: 'text/plain' }),
            });
        }

        return {};
    }

    async watch(input: SandboxFileWatchInput, onOutput: (output: SandboxFileWatchOutput) => void) {
        if (!this.client._client) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Client is not instantiated. Call start() or resume() first.',
                false,
            );
        }

        const sandboxId = (this.client._client.constructor as any).id;

        if (!sandboxId) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not running. Call start() or resume() first.',
                false,
            );
        }

        if (!watchers.has(sandboxId)) {
            watchers.set(sandboxId, new Watcher(this.client));
        }

        const watcher = watchers.get(sandboxId);

        // obviously this should never happen
        if (!watcher) {
            throw new ClientError(ClientErrorCode.ImplementationError, 'Watcher not found', false);
        }

        if (watcher.off) {
            await watcher.start({
                path: this.fullpath(input.path),
                recursive: input.recursive,
                excludePaths: input.excludePaths,
            });
        }

        watcher.onOutput((output) => onOutput(output));

        return {
            close: () => {
                watcher.stop();
            },
        };
    }

    protected fullpath(path: string): string {
        return this.folder + (path.startsWith('/') ? '' : '/') + path;
    }
}

interface WatcherEvent {
    path: string;
    type: 'create' | 'update' | 'delete';
}

class Watcher {
    protected readonly maxEvents = 500;
    // longer timeout might lead to gateway timeouts
    protected readonly promiseTimeout = 30000; // 30 seconds
    protected readonly watchTimeout = 300000; // 5 minutes

    protected events: Array<WatcherEvent> = [];

    protected _off: boolean = true;
    protected _watchHandle: any = null;
    protected _onEventCallbacks: Array<(output: SandboxFileWatchOutput) => void> = [];

    constructor(protected readonly client: CodesandboxClient) {}

    get off(): boolean {
        return this._off;
    }

    async start(input: SandboxFileWatchInput): Promise<void> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }

        if (!this._off) {
            return;
        }

        this._off = false;
        let timeout: NodeJS.Timeout | null = null;

        console.log('starting watch', input);
        // Use WebSocket approach
        const wsClient = await this.client._sandbox.connect();
        console.log('wsClient', wsClient);

        this._watchHandle = await wsClient.fs.watch(input.path, {
            recursive: input.recursive,
            excludes: input.excludePaths,
        });
        console.log('this._watchHandle', this._watchHandle);
        this._watchHandle.onEvent((event: any) => {
            this.events.push(
                ...event.paths.map((path: string) => ({
                    path,
                    type:
                        event.type === 'add'
                            ? 'create'
                            : event.type === 'remove'
                              ? 'delete'
                              : ('update' as 'create' | 'update' | 'delete'),
                })),
            );

            // avoid memory leak
            this.events = this.events.slice(0, this.maxEvents - 1);

            if (timeout) {
                clearTimeout(timeout);
            }

            // debounce the resolution of the promise
            timeout = setTimeout(() => {
                this._onEventCallbacks.forEach((callback) =>
                    callback({
                        id: uuid(),
                        events: this.events,
                    }),
                );
            }, 200);
        });
    }

    onOutput(callback: (output: SandboxFileWatchOutput) => void): void {
        this._onEventCallbacks.push(callback);
    }

    async stop(): Promise<void> {
        if (this._watchHandle) {
            await this._watchHandle.dispose();
            this._watchHandle = null;
        }

        this._off = true;
        this.events = [];
    }
}
