import { ClientError, ClientErrorCode } from '@/provider/definition';
import { E2BClient } from '../..';
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
import { NotFoundError, WatchHandle } from '@e2b/code-interpreter';
import path from 'path';

const watchers: Map<string, Watcher> = new Map();

export class E2BSandboxFile extends SandboxFile<E2BClient> {
    // the folder to store the files in the sandbox
    // when creating a new template, the code must be stored in this folder
    protected folder: string = '/code';

    constructor(client: E2BClient) {
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
        await this.client._sandbox.files.remove(this.fullpath(input.path));
        return {};
    }

    async download(input: SandboxFileDownloadInput): Promise<SandboxFileDownloadOutput> {
        throw new ClientError(ClientErrorCode.Unimplemented, 'Not implemented', false);
    }

    async list(input: SandboxFileListInput): Promise<SandboxFileListOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        try {
            const p = path.normalize(this.fullpath(input.path));
            const files = await this.client._sandbox.files.list(p);
            return {
                files: files.map((file) => ({
                    name: file.name,
                    path: file.path.replace(this.folder, ''),
                    type: file.type === 'file' ? 'file' : 'directory',
                })),
            };
        } catch (e) {
            if (e instanceof NotFoundError) {
                throw new ClientError(
                    ClientErrorCode.FileNotFound,
                    'Folder or file not found',
                    false,
                );
            }
            throw e;
        }
    }

    async read(input: SandboxFileReadInput): Promise<SandboxFileReadOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        try {
            const data = await this.client._sandbox.files.read(this.fullpath(input.path));
            if (!data) {
                throw new ClientError(ClientErrorCode.FileNotFound, 'File not found', false);
            }

            return {
                data,
            };
        } catch (e) {
            if (e instanceof NotFoundError) {
                throw new ClientError(ClientErrorCode.FileNotFound, 'File not found', false);
            }
            throw e;
        }
    }

    async rename(input: SandboxFileRenameInput): Promise<SandboxFileRenameOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        await this.client._sandbox.files.rename(
            this.fullpath(input.oldPath),
            this.fullpath(input.newPath),
        );
        return {};
    }

    async stat(input: SandboxFileStatInput): Promise<SandboxFileStatOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        const file = await this.client._sandbox.files.getInfo(this.fullpath(input.path));
        if (!file) {
            throw new ClientError(ClientErrorCode.FileNotFound, 'File not found', false);
        }
        return {
            type: file.type === 'file' ? 'file' : 'directory',
        };
    }

    async write(input: SandboxFileWriteInput): Promise<SandboxFileWriteOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }
        const files: { path: string; data: string }[] = [];
        for (const file of Array.isArray(input.files) ? input.files : [input.files]) {
            if (!file.overwrite) {
                const exists = await this.client._sandbox.files.exists(this.fullpath(file.path));
                if (exists) {
                    continue;
                }
            }
            files.push({
                path: this.fullpath(file.path),
                data: file.data,
            });
        }
        await this.client._sandbox.files.write(files);
        return {};
    }

    async watch(input: SandboxFileWatchInput): Promise<SandboxFileWatchOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }

        const sandboxId = this.client._sandbox.sandboxId;

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

        const events = await watcher.list();

        return {
            events: events.map((event) => ({
                path: event.path,
                type: event.type,
            })),
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
    protected _watchHandle: WatchHandle | null = null;
    protected _timeout: NodeJS.Timeout | null = null;
    protected _resolvers: Array<() => void> = [];

    constructor(protected readonly client: E2BClient) {}

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
        this._watchHandle = await this.client._sandbox.files.watchDir(
            input.path,
            (event) => {
                if (
                    input.excludePaths.some((exclude) =>
                        event.name.startsWith(exclude.replace('**', '')),
                    )
                ) {
                    return;
                }

                this.events.push({
                    path: event.name,
                    type:
                        event.type === 'create'
                            ? 'create'
                            : event.type === 'remove'
                              ? 'delete'
                              : 'update',
                });

                // avoid memory leak
                this.events = this.events.slice(0, this.maxEvents - 1);

                if (timeout) {
                    clearTimeout(timeout);
                }

                // debounce the resolution of the promise
                timeout = setTimeout(() => {
                    this._resolvers.forEach((resolve) => resolve());
                    this._resolvers = [];
                }, 300);
            },
            {
                // requestTimeoutMs: 0,
                timeoutMs: 0,
                recursive: input.recursive,
                onExit: (err) => {
                    console.error('[coderouter] watcher exited – error: ', err || 'none');
                    this.stop();
                },
            },
        );
    }

    async list(): Promise<Array<WatcherEvent>> {
        if (this._timeout) {
            clearTimeout(this._timeout);
            this._timeout = null;
        }

        // if there hasn't been any calls to `list` within the timeout, stop the watcher
        this._timeout = setTimeout(() => {
            this.stop();
        }, this.watchTimeout);

        // if there are no events, do not return yet
        if (this.events.length === 0) {
            let resolved = false;
            await new Promise<void>((resolve) => {
                this._resolvers.push(() => {
                    if (!resolved) {
                        resolve();
                        resolved = true;
                    }
                });
                setTimeout(() => {
                    if (!resolved) {
                        resolve();
                        resolved = true;
                    }
                }, this.promiseTimeout);
            });
        }

        const events = this.events;
        this.events = [];
        return events;
    }

    async stop(): Promise<void> {
        if (this._watchHandle) {
            await this._watchHandle.stop();
            this._watchHandle = null;
        }

        this._off = true;
        this.events = [];
    }
}
