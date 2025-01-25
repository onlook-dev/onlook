import { DefaultSettings, HOSTING_DOMAIN, MainChannels } from '@onlook/models/constants';
import { HostingStatus, type CustomDomain } from '@onlook/models/hosting';
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
        this.projectsManager.updateProject(newProject);
        this.project = newProject;
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
        this.updateState({ status: HostingStatus.READY, message: null, url: newUrl });
        return true;
    }

    async publish(selectedDomains: string[] = [], skipBuild: boolean = false): Promise<boolean> {
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

        const urls = selectedDomains.length > 0 ? selectedDomains : [this.project.hosting?.url];
        if (urls.length === 0) {
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
            urls,
            skipBuild,
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
            urls: urls,
        });

        this.updateState({ status: res.state, message: res.message });
        return true;
    }

    async unpublish(selectedDomains: string[] = []) {
        this.updateState({ status: HostingStatus.DELETING, message: 'Deleting deployment...' });
        sendAnalytics('hosting unpublish');

        const urls = selectedDomains.length > 0 ? selectedDomains : [this.state.url];
        if (urls.length === 0) {
            console.error('Failed to unpublish hosting environment, missing url');
            sendAnalyticsError('Failed to unpublish', {
                message: 'Failed to unpublish hosting environment, missing url',
            });
            return;
        }
        const res: {
            success: boolean;
            message?: string;
        } = await invokeMainChannel(MainChannels.UNPUBLISH_HOSTING_ENV, {
            urls,
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

    async getCustomDomains(): Promise<CustomDomain[]> {
        const res: CustomDomain[] = await invokeMainChannel(MainChannels.GET_CUSTOM_DOMAINS);
        return res;
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
