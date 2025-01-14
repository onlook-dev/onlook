import { DefaultSettings, HOSTING_DOMAIN, MainChannels } from '@onlook/models/constants';
import { HostingStatus } from '@onlook/models/hosting';
import type { Project } from '@onlook/models/projects';
import { makeAutoObservable } from 'mobx';
import type { ProjectsManager } from '.';
import { invokeMainChannel, sendAnalytics, sendAnalyticsError } from '../utils';

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
        this.updateState({
            status: this.project.hosting?.url ? HostingStatus.READY : HostingStatus.NO_ENV,
            message: null,
            url: this.project.hosting?.url || null,
        });
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

    async createLink(): Promise<boolean> {
        const newUrl = `${this.createProjectSubdomain(this.project.id)}.${HOSTING_DOMAIN}`;
        sendAnalytics('hosting create link', {
            url: newUrl,
        });
        this.updateProject({
            hosting: {
                url: newUrl,
            },
        });
        const success = await this.publish();
        if (!success) {
            this.updateProject({
                hosting: {
                    url: null,
                },
            });
            this.updateState({ status: HostingStatus.ERROR, message: 'Failed to create link' });
            return false;
        }
        return true;
    }

    async publish(): Promise<boolean> {
        sendAnalytics('hosting publish');
        const folderPath = this.project.folderPath;
        if (!folderPath) {
            console.error('Failed to publish hosting environment, missing folder path');
            sendAnalyticsError('Failed to publish', {
                message: 'Failed to publish hosting environment, missing folder path',
            });
            return false;
        }

        const buildScript: string = this.project.commands?.build || DefaultSettings.COMMANDS.build;
        if (!buildScript) {
            console.error('Failed to publish hosting environment, missing build script');
            sendAnalyticsError('Failed to publish', {
                message: 'Failed to publish hosting environment, missing build script',
            });
            return false;
        }

        const url = this.project.hosting?.url;
        if (!url) {
            console.error('Failed to publish hosting environment, missing url');
            sendAnalyticsError('Failed to publish', {
                message: 'Failed to publish hosting environment, missing url',
            });
            return false;
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

        if (!res || res.state === HostingStatus.ERROR) {
            console.error('Failed to publish hosting environment: ', res);
            this.updateState({
                status: HostingStatus.ERROR,
                message: `Failed to publish hosting environment: ${res?.message || 'client error'}`,
            });
            sendAnalyticsError('Failed to publish', {
                message: `Failed to publish hosting environment: ${res?.message || 'client error'}`,
            });
            return false;
        }

        sendAnalytics('hosting publish success', {
            state: res.state,
            message: res.message,
        });

        this.updateState({ status: res.state, message: res.message });
        return true;
    }

    async unpublish() {
        this.updateState({ status: HostingStatus.DELETING, message: 'Deleting deployment...' });
        sendAnalytics('hosting unpublish');
        const res: {
            success: boolean;
            message?: string;
        } = await invokeMainChannel(MainChannels.UNPUBLISH_HOSTING_ENV, {
            url: this.state.url,
        });

        if (!res.success) {
            console.error('Failed to unpublish hosting environment', res);
            this.updateState({
                status: HostingStatus.ERROR,
                message: res.message || 'Failed to unpublish hosting environment',
            });
            sendAnalyticsError('Failed to unpublish', {
                message: res.message || 'Failed to unpublish hosting environment',
            });
            return;
        }

        this.updateProject({
            hosting: {
                url: null,
            },
        });
        this.updateState({ status: HostingStatus.NO_ENV, message: null, url: null });
        sendAnalytics('hosting unpublish success');
    }

    async dispose() {
        if (this.stateChangeListener) {
            window.api.removeListener(MainChannels.DEPLOY_STATE_CHANGED, this.stateChangeListener);
        }
    }

    refresh() {
        if (this.state.url) {
            this.updateState({ status: HostingStatus.READY, message: null });
        } else {
            this.updateState({ status: HostingStatus.NO_ENV, message: null, url: null });
        }
    }
}
