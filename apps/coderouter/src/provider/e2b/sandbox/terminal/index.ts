import { ClientError, ClientErrorCode } from '@/provider/definition';
import { E2BClient } from '../..';
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
import { CommandExitError, CommandHandle } from '@e2b/code-interpreter';
import { v4 as uuid } from 'uuid';

// sandboxId -> terminalId -> TerminalWatcher
const terminalWatchers: Map<string, Map<string, TerminalWatcher>> = new Map();

export class E2BSandboxTerminal extends SandboxTerminal<E2BClient> {
    constructor(client: E2BClient) {
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
            const result = await this.client._sandbox.commands.run(input.command);
            return {
                output: result.stdout || result.stderr,
                is_error: !!result.error || result.exitCode !== 0,
                stdout: result.stdout,
                stderr: result.stderr,
                exit_code: result.exitCode,
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

        const sandboxId = this.client._sandbox.sandboxId;
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

        const watcher = terminalWatchers.get(this.client._sandbox.sandboxId)?.get(input.terminalId);
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

        watcher.onOutput((output) => onOutput(output));

        return {
            close: () => {
                watcher.stop();
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

        const watcher = terminalWatchers.get(this.client._sandbox.sandboxId)?.get(input.terminalId);
        if (!watcher) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Terminal not found. Call create() first.',
                false,
            );
        }

        // Write input to the terminal
        await watcher.writeInput(input.input);

        return {
            output: '',
        };
    }

    async run(input: SandboxTerminalRunInput): Promise<SandboxTerminalRunOutput> {
        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Sandbox is not instantiated. Call start() or resume() first.',
                false,
            );
        }

        const watcher = terminalWatchers.get(this.client._sandbox.sandboxId)?.get(input.terminalId);
        if (!watcher) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Terminal not found. Call create() first.',
                false,
            );
        }

        // Execute the command and get output
        await watcher.executeCommand(input.input);

        return {
            output: '',
        };
    }

    async kill(input: SandboxTerminalKillInput): Promise<SandboxTerminalKillOutput> {
        if (!this.client._sandbox) {
            return {
                output: 'Sandbox is not instantiated. Call start() or resume() first.',
            };
        }

        const watcher = terminalWatchers.get(this.client._sandbox.sandboxId)?.get(input.terminalId);
        if (watcher) {
            await watcher.stop();
            terminalWatchers.get(this.client._sandbox.sandboxId)?.delete(input.terminalId);
        }

        return {
            output: 'Terminal killed',
        };
    }
}

class TerminalWatcher {
    protected readonly watchTimeout = 0;

    protected _off: boolean = true;
    protected _terminalHandle: CommandHandle | null = null;
    protected _onOutputCallbacks: Array<(output: SandboxTerminalOpenOutput) => void> = [];

    constructor(
        protected readonly client: E2BClient,
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

        // Create PTY terminal with real-time data callback
        this._terminalHandle = await this.client._sandbox.pty.create({
            timeoutMs: this.watchTimeout,
            onData: (data: Uint8Array) => {
                // Convert Uint8Array to string
                const output = new TextDecoder().decode(data);
                this._onOutputCallbacks.forEach((callback) => callback({ id: uuid(), output }));
            },
            cols: 80,
            rows: 24,
        });

        try {
            await this._terminalHandle?.wait();
        } catch (err) {
            // taken from: https://github.com/e2b-dev/E2B/blob/main/packages/cli/src/terminal.ts#L10
            if (err instanceof CommandExitError) {
                if (err.exitCode === -1 && err.error === 'signal: killed') {
                    return;
                }
                if (err.exitCode === 130) {
                    console.error('Terminal session was killed by user');
                    return;
                }
            }
            console.error('error waiting for terminal handle', err);
            throw err;
        } finally {
            console.log('stopping terminal watcher');
            this.stop();
        }
    }

    onOutput(callback: (output: SandboxTerminalOpenOutput) => void): void {
        this._onOutputCallbacks.push(callback);
    }

    async writeInput(input: string): Promise<void> {
        if (!this._terminalHandle) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Terminal not initialized. Call start() first.',
                false,
            );
        }

        if (!this.client._sandbox) {
            throw new ClientError(
                ClientErrorCode.ImplementationError,
                'Terminal not initialized. Call start() first.',
                false,
            );
        }

        // Convert string to Uint8Array and send to the PTY terminal
        const data = new TextEncoder().encode(input);
        await this.client._sandbox.pty.sendInput(this._terminalHandle.pid, data);
    }

    async executeCommand(command: string): Promise<void> {
        await this.writeInput(command);
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
