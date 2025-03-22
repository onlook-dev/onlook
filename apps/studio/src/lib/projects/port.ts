import { MainChannels, RunState, type DetectedPortResults, type Project } from '@onlook/models';
import { makeAutoObservable, reaction } from 'mobx';
import { invokeMainChannel } from '../utils';
import type { RunManager } from './run';

export class PortManager {
    isPortAvailable: boolean = true;
    suggestedPort: number = 3000;
    currentPort: number = 3000;
    portCheckInterval: Timer | null = null;

    constructor(
        private runManager: RunManager,
        private project: Project,
    ) {
        makeAutoObservable(this);
        this.currentPort = this.getPortFromProject();
        this.listenForPortChanges();
        reaction(
            () => this.runManager.state,
            () => {
                if (this.runManager.state !== RunState.STOPPED) {
                    this.isPortAvailable = true;
                }
            },
        );
    }

    listenForPortChanges() {
        this.clearPortCheckInterval();
        this.portCheckInterval = setInterval(async () => {
            await this.checkPort();
        }, 3000);
    }

    getPortFromProject() {
        try {
            const url = this.project.url;
            const urlObj = new URL(url);
            return parseInt(urlObj.port, 10);
        } catch (error) {
            console.error('Failed to get port from project:', error);
            return 3000;
        }
    }

    updateProject(project: Project) {
        this.project = project;
        this.currentPort = this.getPortFromProject();
    }

    async checkPort(): Promise<boolean> {
        if (this.runManager.state !== RunState.STOPPED) {
            this.isPortAvailable = true;
            return this.isPortAvailable;
        }

        const response: DetectedPortResults = await invokeMainChannel(
            MainChannels.IS_PORT_AVAILABLE,
            {
                port: this.currentPort,
            },
        );
        this.isPortAvailable = response.isPortAvailable;
        this.suggestedPort = response.availablePort;
        return this.isPortAvailable;
    }

    clearPortCheckInterval() {
        if (this.portCheckInterval) {
            clearInterval(this.portCheckInterval);
            this.portCheckInterval = null;
        }
    }

    dispose() {
        this.clearPortCheckInterval();
    }
}
