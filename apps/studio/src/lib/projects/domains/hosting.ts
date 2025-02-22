import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import { PublishStatus, type CustomDomain, type PublishState } from '@onlook/models/hosting';
import { DomainType, type DomainSettings, type Project } from '@onlook/models/projects';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel, sendAnalytics, sendAnalyticsError } from '../../utils/index.ts';
import type { ProjectsManager } from '../index.ts';
import { getPublishUrls } from './helpers.ts';

const DEFAULT_STATE: PublishState = {
    status: PublishStatus.UNPUBLISHED,
    message: null
};

export class HostingManager {
    private stateChangeListener: ((...args: any[]) => void) | null = null;
    state: PublishState = DEFAULT_STATE;

    constructor(
        private projectsManager: ProjectsManager,
        private project: Project,
        private domain: DomainSettings,
    ) {
        makeAutoObservable(this);
        this.listenForStateChanges();
        if (domain.publishedAt) {
            this.updateState({ status: PublishStatus.PUBLISHED, message: null });
        }
    }

    async listenForStateChanges() {
        this.stateChangeListener = async (args: any) => {
            const state: PublishState = args;
            this.updateState(state);
        };
        window.api.on(MainChannels.PUBLISH_STATE_CHANGED, this.stateChangeListener);
    }

    updateDomain(domain: DomainSettings) {
        let domains = { base: null, custom: null, ...this.project.domains };

        if (domain.type === DomainType.BASE) {
            domains.base = domain;
        } else if (domain.type === DomainType.CUSTOM) {
            domains.custom = domain;
        }

        const newProject = { ...this.project, domains };
        this.projectsManager.updateProject(newProject);
        this.project = newProject;
    }

    updateState(partialState: Partial<PublishState>) {
        this.state = { ...this.state, ...partialState };
    }

    async publish(skipBuild: boolean = false): Promise<boolean> {
        sendAnalytics('hosting publish');
        this.updateState({ status: PublishStatus.LOADING, message: 'Creating deployment...' });

        const deploymentRequest: {
            folderPath: string;
            buildScript: string;
            urls: string[];
            skipBuild: boolean;
        } = {
            folderPath: this.project.folderPath,
            buildScript: this.project.commands?.build || DefaultSettings.COMMANDS.build,
            urls: getPublishUrls(this.domain.url),
            skipBuild,
        }

        const res: PublishState | null = await invokeMainChannel(MainChannels.PUBLISH_TO_DOMAIN, deploymentRequest);

        if (!res || res.status === PublishStatus.ERROR) {
            const error = `Failed to publish hosting environment: ${res?.message || 'client error'}`;
            console.error(error);
            this.updateState({
                status: PublishStatus.ERROR,
                message: error,
            });
            sendAnalyticsError('Failed to publish', {
                message: error,
            });
            return false;
        }

        sendAnalytics('hosting publish success', {
            status: res.status,
            message: res.message,
            urls: deploymentRequest.urls,
        });

        this.updateState({ status: res.status, message: res.message });
        return true;
    }

    async unpublish() {
        this.updateState({ status: PublishStatus.LOADING, message: 'Deleting deployment...' });
        sendAnalytics('hosting unpublish');

        const urls = getPublishUrls(this.domain.url);
        const res: {
            success: boolean;
            message?: string;
        } = await invokeMainChannel(MainChannels.UNPUBLISH_DOMAIN, {
            urls,
        });

        if (!res.success) {
            const error = `Failed to unpublish hosting environment: ${res?.message || 'client error'}`;
            console.error(error);
            this.updateState({
                status: PublishStatus.ERROR,
                message: error,
            });
            sendAnalyticsError('Failed to unpublish', {
                message: error,
            });
            return;
        }

        this.updateDomain({
            ...this.domain,
            publishedAt: null,
        });
        this.updateState({ status: PublishStatus.UNPUBLISHED, message: null });
        sendAnalytics('hosting unpublish success');
    }

    async getCustomDomains(): Promise<CustomDomain[]> {
        const res: CustomDomain[] = await invokeMainChannel(MainChannels.GET_CUSTOM_DOMAINS);
        return res;
    }

    async dispose() {
        if (this.stateChangeListener) {
            window.api.removeListener(MainChannels.PUBLISH_STATE_CHANGED, this.stateChangeListener);
        }
    }

    refresh() {
        this.updateState(DEFAULT_STATE);
    }
}
