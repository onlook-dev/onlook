import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import { RunState } from '@onlook/models/run';
import { Terminal } from '@xterm/xterm';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export type TerminalMessage = {
    id: string;
    data: string;
};

export class RunManager {
    private project: Project;
    term: Terminal | null = null;
    state: RunState = RunState.STOPPED;
    message: string | null = null;

    constructor(project: Project) {
        makeAutoObservable(this);
        this.project = project;
        this.listenForStateChanges();
        // TODO: Restore history and state
    }

    async start() {
        return await invokeMainChannel(MainChannels.RUN_SETUP, {
            id: this.project.id,
            folderPath: this.project.folderPath,
            command: 'bun run dev',
        });
    }

    async stop() {
        return await invokeMainChannel(MainChannels.RUN_STOP, {
            id: this.project.id,
            folderPath: this.project.folderPath,
        });
    }

    async listenForStateChanges() {
        window.api.on(MainChannels.RUN_STATE_CHANGED, async (e, args) => {
            const { state, message } = args as { state: RunState; message: string };
            this.state = state;
            this.message = message;
        });
    }

    async connectTerminalUI(terminalElement: HTMLDivElement) {
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
        window.api.on(MainChannels.TERMINAL_ON_DATA, (message: TerminalMessage) => {
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
    }

    async dispose() {
        await this.stop();
        this.disposeTerminal();
    }
}
