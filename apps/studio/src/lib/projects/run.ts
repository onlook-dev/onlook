import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import { RunState } from '@onlook/models/run';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel } from '../utils';

export type TerminalMessage = {
    id: string;
    data: string;
};

export class RunManager {
    private project: Project;
    state: RunState = RunState.STOPPED;
    message: string | null = null;

    constructor(project: Project) {
        makeAutoObservable(this);
        this.project = project;
        this.restoreState();
        this.listenForStateChanges();
    }

    async start() {
        return await invokeMainChannel(MainChannels.RUN_SETUP, {
            id: this.project.id,
            folderPath: this.project.folderPath,
            command: this.project.runCommand || 'npm run dev',
        });
    }

    async stop() {
        return await invokeMainChannel(MainChannels.RUN_STOP, {
            id: this.project.id,
            folderPath: this.project.folderPath,
        });
    }

    async restoreState() {
        const state = await invokeMainChannel(MainChannels.GET_RUN_STATE, {
            id: this.project.id,
        });
        this.state = state as RunState;
    }

    async listenForStateChanges() {
        window.api.on(MainChannels.RUN_STATE_CHANGED, async (args) => {
            const { state, message } = args as { state: RunState; message: string };
            this.state = state;
            this.message = message;
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

    getHistory(): Promise<string> {
        return invokeMainChannel(MainChannels.TERMINAL_GET_HISTORY, {
            id: this.project.id,
        });
    }

    async dispose() {
        await this.stop();
    }
}
