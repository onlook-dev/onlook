import { DefaultSettings, MainChannels } from '@onlook/models/constants';
import {
    PublishStatus,
    type PublishRequest,
    type PublishResponse,
    type PublishState,
} from '@onlook/models/hosting';
import { DomainType, type DomainSettings, type Project } from '@onlook/models/projects';
import { getPublishUrls } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import { invokeMainChannel, sendAnalytics, sendAnalyticsError } from '../../utils/index.ts';
import type { ProjectsManager } from '../index.ts';

const DEFAULT_STATE: PublishState = {
    status: PublishStatus.UNPUBLISHED,
    message: null,
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
        if (this.domain.publishedAt) {
            this.updateState({
                status: PublishStatus.PUBLISHED,
                message: null,
            });
        }
    }

    async listenForStateChanges() {
        this.stateChangeListener = async (args: any) => {
            const state: PublishState = args;
            this.updateState(state);
        };
        window.api.on(MainChannels.PUBLISH_STATE_CHANGED, this.stateChangeListener);
    }

    private updateDomain(domain: DomainSettings) {
        const domains = { base: null, custom: null, ...this.project.domains };

        if (domain.type === DomainType.BASE) {
            domains.base = domain;
        } else if (domain.type === DomainType.CUSTOM) {
            domains.custom = domain;
        }

        this.updateProject({ domains });
    }

    private removeDomain(type: DomainType) {
        const domains = { base: null, custom: null, ...this.project.domains };
        if (type === DomainType.BASE) {
            domains.base = null;
        } else if (type === DomainType.CUSTOM) {
            domains.custom = null;
        }

        this.updateProject({ domains });
    }

    private updateProject(project: Partial<Project>) {
        const newProject = { ...this.project, ...project };
        this.projectsManager.updateProject(newProject);
        this.project = newProject;
    }

    private updateState(partialState: Partial<PublishState>) {
        this.state = { ...this.state, ...partialState };
    }

    async publish(options?: { skipBuild?: boolean; skipBadge?: boolean }): Promise<boolean> {
        sendAnalytics('hosting publish');
        this.updateState({ status: PublishStatus.LOADING, message: 'Creating deployment...' });

        await this.projectsManager.versions?.createCommit(
            `Save before publishing to ${this.domain.url}`,
            false,
        );

        const request: PublishRequest = {
            folderPath: this.project.folderPath,
            buildScript: this.project.commands?.build || DefaultSettings.COMMANDS.build,
            urls:
                this.domain.type === DomainType.CUSTOM
                    ? getPublishUrls(this.domain.url)
                    : [this.domain.url],
            options,
        };

        const res: PublishResponse | null = await invokeMainChannel(
            MainChannels.PUBLISH_TO_DOMAIN,
            request,
        );

        if (!res || !res.success) {
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

        this.updateState({ status: PublishStatus.PUBLISHED, message: res.message });
        this.updateDomain({ ...this.domain, publishedAt: new Date().toISOString() });

        sendAnalytics('hosting publish success', {
            urls: request.urls,
        });
        return true;
    }

    async unpublish(): Promise<boolean> {
        this.updateState({ status: PublishStatus.LOADING, message: 'Deleting deployment...' });
        sendAnalytics('hosting unpublish');

        const urls = getPublishUrls(this.domain.url);
        const res: PublishResponse = await invokeMainChannel(MainChannels.UNPUBLISH_DOMAIN, {
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
            return false;
        }

        this.removeDomain(this.domain.type);
        this.updateState({ status: PublishStatus.UNPUBLISHED, message: null });
        sendAnalytics('hosting unpublish success');
        return true;
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
