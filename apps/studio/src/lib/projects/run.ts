import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import { Terminal } from '@xterm/xterm';
import { invokeMainChannel } from '../utils';

export type TerminalMessage = {
    id: string;
    data: string;
};

export enum RunState {
    READY = 'ready',
    PRERUN = 'prerun',
    WAITING = 'waiting',
    RUNNING = 'running',
    ERROR = 'error',
}

export class RunManager {
    private project: Project;
    term: Terminal | null = null;
    state: RunState = RunState.READY;
    error: string | null = null;

    constructor(project: Project) {
        this.project = project;
    }

    initializeTerminal(terminalElement: HTMLDivElement) {
        this.term = new Terminal({
            cursorBlink: true,
            fontSize: 12,
            fontFamily: 'monospace',
        });

        this.term.open(terminalElement);
        const { cols, rows } = this.term;
        this.resizeTerminal(cols, rows);

        // Set up event listeners
        this.term.onData((data) => {
            this.handleTerminalInput(data);
        });

        // Set up data stream listener
        window.api.on(MainChannels.TERMINAL_DATA_STREAM, (message: TerminalMessage) => {
            if (message.id === this.project.id) {
                this.term?.write(message.data);
            }
        });
    }

    handleTerminalInput(data: string) {
        return invokeMainChannel(MainChannels.TERMINAL_INPUT, {
            id: this.project.id,
            data,
        });
    }

    resizeTerminal(cols: number, rows: number) {
        return invokeMainChannel(MainChannels.TERMINAL_RESIZE, {
            id: this.project.id,
            cols,
            rows,
        });
    }

    disposeTerminal() {
        this.term?.dispose();
        this.term = null;
        return this.killTerminal();
    }

    async run() {
        if (this.state !== RunState.READY) {
            this.setError('Failed to run. State is not ready.');
            return;
        }

        const res = await this.prerun();
        if (!res) {
            this.setError('Failed to run. Prerun failed.');
            return;
        }

        const terminalRes = await this.createTerminal();
        if (!terminalRes) {
            this.setError('Failed to run. Failed to create terminal.');
            return;
        }

        const executeCommandRes = await this.executeCommand('bun run dev');
        if (!executeCommandRes) {
            this.setError('Failed to run. Failed to execute command.');
            return;
        }

        this.state = RunState.RUNNING;
        this.error = null;
    }

    async stop() {
        if (this.state !== RunState.RUNNING) {
            this.setError('Failed to stop. State is not running.');
            return;
        }
        this.state = RunState.WAITING;

        const executeCommandRes = await this.executeCommand('\x03');
        if (!executeCommandRes) {
            this.setError('Failed to stop. Failed to execute command.');
            return;
        }

        const killTerminalRes = await this.killTerminal();
        if (!killTerminalRes) {
            this.setError('Failed to stop. Failed to kill terminal.');
            return;
        }

        const res = await this.cleanup();
        if (!res) {
            this.setError('Failed to stop. Cleanup failed.');
            return;
        }
        this.state = RunState.READY;
        this.error = null;
    }

    private async createTerminal() {
        return await invokeMainChannel(MainChannels.TERMINAL_CREATE, {
            id: this.project.id,
            options: { cwd: this.project.folderPath },
        });
    }

    private async killTerminal() {
        return await invokeMainChannel(MainChannels.TERMINAL_KILL, {
            id: this.project.id,
        });
    }

    private async executeCommand(command: string) {
        return await invokeMainChannel(MainChannels.TERMINAL_EXECUTE_COMMAND, {
            id: this.project.id,
            command,
        });
    }

    private async prerun(): Promise<boolean | null> {
        this.state = RunState.PRERUN;
        return await invokeMainChannel(MainChannels.RUN_SETUP, {
            dirPath: this.project.folderPath,
            command: 'bun run dev',
        });
    }

    private async cleanup(): Promise<boolean | null> {
        return await invokeMainChannel(MainChannels.RUN_CLEANUP, {
            dirPath: this.project.folderPath,
        });
    }

    private setError(message: string) {
        console.error(message);
        this.error = message;
        this.state = RunState.ERROR;
    }
}
