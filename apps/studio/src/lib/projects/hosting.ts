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

    updateProject(partialProject: Partial<Project>) {
        const newProject = { ...this.project, ...partialProject };
        this.project = newProject;
        this.projectsManager.updateProject(newProject);
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

    createProjectSubdomain(id: string) {
        // Make this a valid subdomain by:
        // 1. Converting to lowercase
        // 2. Replacing invalid characters with hyphens
        // 3. Removing consecutive hyphens
        // 4. Removing leading/trailing hyphens
        return id
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    createLink() {
        const newUrl = `${this.createProjectSubdomain(this.project.id)}.onlook.live`;
        this.updateProject({
            hosting: {
                url: newUrl,
            },
        });
        this.updateState({ url: newUrl, status: HostingStatus.READY });

        this.publish();
    }

    async publish() {
        const folderPath = this.project.folderPath;
        if (!folderPath) {
            console.error('Failed to publish hosting environment, missing folder path');
            return;
        }

        const buildScript: string = this.project.commands?.build || 'npm run build';
        if (!buildScript) {
            console.error('Failed to publish hosting environment, missing build script');
            return;
        }

        const url = this.project.hosting?.url;
        if (!url) {
            console.error('Failed to publish hosting environment, missing url');
            return;
        }

        this.updateState({ status: HostingStatus.DEPLOYING, message: 'Creating deployment...' });

        const res: {
            state: HostingStatus;
            message?: string;
        } | null = await invokeMainChannel(MainChannels.START_DEPLOYMENT, {
            folderPath,
            buildScript,
            url,
        });

        if (!res) {
            console.error('Failed to publish hosting environment');
            this.updateState({
                status: HostingStatus.ERROR,
                message: 'Failed to publish hosting environment, no response from client',
            });
            return;
        }

        this.updateState({ status: res.state, message: res.message });
    }

    async unpublish() {
        this.updateState({ status: HostingStatus.DELETING, message: 'Deleting deployment...' });
        const res: boolean = await invokeMainChannel(MainChannels.UNPUBLISH_HOSTING_ENV, {
            url: this.state.url,
        });

        if (!res) {
            console.error('Failed to unpublish hosting environment');
            this.updateState({
                status: HostingStatus.ERROR,
                message: 'Failed to unpublish hosting environment',
            });
            return;
        }

        this.updateProject({
            hosting: {
                url: null,
            },
        });
        this.updateState({ status: HostingStatus.NO_ENV, message: null, url: null });
    }

    async dispose() {
        if (this.stateChangeListener) {
            window.api.removeListener(MainChannels.DEPLOY_STATE_CHANGED, this.stateChangeListener);
        }
    }

    refresh() {
        this.updateState({ status: HostingStatus.READY, message: null });
    }
}
