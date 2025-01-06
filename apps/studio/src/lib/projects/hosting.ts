import { MainChannels } from '@onlook/models/constants';
import { HostingStatus } from '@onlook/models/hosting';
import type { Project } from '@onlook/models/projects';
import { makeAutoObservable } from 'mobx';
import type { ProjectsManager } from '.';
import { invokeMainChannel } from '../utils';

const DEFAULT_STATE: HostingState = {
    status: HostingStatus.READY,
    message: null,
    url: null,
};

interface HostingState {
    status: HostingStatus;
    message: string | null;
    url: string | null;
}

export class HostingManager {
    private project: Project;
    state: HostingState = DEFAULT_STATE;
    private stateChangeListener: ((...args: any[]) => void) | null = null;

    constructor(
        private projectsManager: ProjectsManager,
        project: Project,
    ) {
        makeAutoObservable(this);
        this.project = project;
        this.restoreState();
        this.listenForStateChanges();
    }

    private restoreState() {
        this.state = {
            status: this.project.hosting?.url ? HostingStatus.READY : HostingStatus.NO_ENV,
            message: null,
            url: this.project.hosting?.url || null,
        };
    }

    async listenForStateChanges() {
        this.stateChangeListener = async (args: any) => {
            const { state, message } = args as { state: HostingStatus; message: string };
            this.updateState({ status: state, message });
        };

        window.api.on(MainChannels.DEPLOY_STATE_CHANGED, this.stateChangeListener);
    }

    updateState(partialState: Partial<HostingState>) {
        this.state = { ...this.state, ...partialState };
    }

    async createLink() {
        const newUrl = `${this.project.id}.onlook.live`;
        this.projectsManager.updateProject({
            ...this.project,
            hosting: {
                url: newUrl,
            },
        });

        console.log('newUrl', newUrl);
        this.updateState({ url: newUrl, status: HostingStatus.READY });
    }

    async publish() {
        const folderPath = this.project.folderPath;
        const buildScript: string = this.project.commands?.build || 'npm run build';
        const url = this.project.hosting?.url;

        if (!folderPath || !buildScript || !url) {
            console.error('Missing required data for publishing');
            return;
        }

        const res = await invokeMainChannel(MainChannels.START_DEPLOYMENT, {
            folderPath,
            buildScript,
            url,
        });

        if (!res) {
            console.error('Failed to publish hosting environment');
        }
    }

    get isDeploying() {
        return this.state.status === HostingStatus.DEPLOYING;
    }

    async dispose() {
        if (this.stateChangeListener) {
            window.api.removeListener(MainChannels.DEPLOY_STATE_CHANGED, this.stateChangeListener);
        }
    }
}
