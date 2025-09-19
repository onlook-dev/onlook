import { ClientError, ClientErrorCode } from '@/provider/definition';
import { CodesandboxClient } from '../..';
import {
    SandboxTerminal,
    SandboxTerminalCommandInput,
    SandboxTerminalCommandOutput,
    SandboxTerminalCreateInput,
    SandboxTerminalCreateOutput,
    SandboxTerminalOpenInput,
    SandboxTerminalOpenOutput,
    SandboxTerminalWriteInput,
    SandboxTerminalWriteOutput,
    SandboxTerminalRunInput,
    SandboxTerminalRunOutput,
    SandboxTerminalKillInput,
    SandboxTerminalKillOutput,
} from '../../../definition/sandbox/terminal';
import { Terminal as CodesandboxTerminal } from '@codesandbox/sdk';
import { v4 as uuid } from 'uuid';

// sandboxId -> terminalId -> TerminalWatcher
const terminalWatchers: Map<string, Map<string, TerminalWatcher>> = new Map();

export class CodesandboxSandboxTerminal extends SandboxTerminal<CodesandboxClient> {
    constructor(client: CodesandboxClient) {
        super(client);
    }

    async command(input: SandboxTerminalCommandInput): Promise<SandboxTerminalCommandOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }

        try {
            const client = await this.client._sandbox.connect();
            const result = await client.commands.run(input.command);
            return {
                output: result,
                is_error: false,
                stdout: undefined,
                stderr: undefined,
                exit_code: 0,
            };
        } catch (error) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                `Failed to execute command: ${error}`,
                false,
            );
        }
    }

    async create(input: SandboxTerminalCreateInput): Promise<SandboxTerminalCreateOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }

        const sandboxId = this.client._sandbox.id;
        if (!sandboxId) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not running. Call start() or resume() first.',
                false,
            );
        }

        // Create a new terminal watcher for this terminal ID
        if (!terminalWatchers.has(sandboxId)) {
            terminalWatchers.set(sandboxId, new Map());
        }
        if (!terminalWatchers.get(sandboxId)!.has(input.terminalId)) {
            terminalWatchers
                .get(sandboxId)!
                .set(input.terminalId, new TerminalWatcher(this.client, input.terminalId));
        }

        terminalWatchers.get(sandboxId)!.get(input.terminalId)!.start();

        return {
            terminalId: input.terminalId,
            name: input.name,
        };
    }

    async open(
        input: SandboxTerminalOpenInput,
        onOutput: (output: SandboxTerminalOpenOutput) => void,
    ) {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }

        const watcher = terminalWatchers.get(this.client._sandbox.id)?.get(input.terminalId);
        if (!watcher) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Terminal not found. Call create() first.',
                false,
            );
        }

        // Start the terminal watcher if it's not already running
        if (watcher.off) {
            await watcher.start();
        }

        const unsubscribe = watcher.onOutput((output) => onOutput(output));

        return {
            close: () => {
                unsubscribe();
            },
        };
    }

    async write(input: SandboxTerminalWriteInput): Promise<SandboxTerminalWriteOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }

        const watcher = terminalWatchers.get(this.client._sandbox.id)?.get(input.terminalId);
        if (!watcher) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Terminal not found. Call create() first.',
                false,
            );
        }

        // Write input to the terminal
        await watcher.writeInput(input.input);

        return {};
    }

    async run(input: SandboxTerminalRunInput): Promise<SandboxTerminalRunOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }

        const watcher = terminalWatchers.get(this.client._sandbox.id)?.get(input.terminalId);
        if (!watcher) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Terminal not found. Call create() first.',
                false,
            );
        }

        // Execute the command and get output
        await watcher.executeCommand(input.input);

        return {};
    }

    async kill(input: SandboxTerminalKillInput): Promise<SandboxTerminalKillOutput> {
        if (!this.client._sandbox) {
            return {
                output: 'Sandbox is not instantiated. Call start() or resume() first.',
            };
        }

        const watcher = terminalWatchers.get(this.client._sandbox.id)?.get(input.terminalId);
        if (watcher) {
            await watcher.stop();
            terminalWatchers.get(this.client._sandbox.id)?.delete(input.terminalId);
        }

        return {
            output: 'Terminal killed',
        };
    }
}

class TerminalWatcher {
    protected readonly watchTimeout = 0;

    protected _off: boolean = true;
    protected _terminalHandle: CodesandboxTerminal | null = null;
    protected _onOutputCallbacks: Array<(output: SandboxTerminalOpenOutput) => void> = [];

    constructor(
        protected readonly client: CodesandboxClient,
        protected readonly terminalId: string,
    ) {}

    get off(): boolean {
        return this._off;
    }

    async start(): Promise<void> {
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

        const client = await this.client._sandbox.connect();

        // Create PTY terminal with real-time data callback
        this._terminalHandle = await client.terminals.create();
    }

    onOutput(callback: (output: SandboxTerminalOpenOutput) => void): () => void {
        const disposable = this._terminalHandle?.onOutput((output) =>
            callback({ id: uuid(), output }),
        );
        return () => {
            disposable?.dispose();
        };
    }

    async writeInput(input: string): Promise<void> {
        if (!this._terminalHandle) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Terminal not initialized. Call start() first.',
                false,
            );
        }

        this._terminalHandle.write(input);
    }

    async executeCommand(command: string): Promise<void> {
        if (!this._terminalHandle) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Terminal not initialized. Call start() first.',
                false,
            );
        }

        this._terminalHandle.run(command);
    }

    async stop(): Promise<void> {
        this._off = true;

        // Close the PTY terminal
        if (this._terminalHandle) {
            await this._terminalHandle.kill();
            this._terminalHandle = null;
        }

        this._onOutputCallbacks = [];
    }
}
