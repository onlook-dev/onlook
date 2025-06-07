import { env } from '@/env';
import { sendAnalytics } from '@/utils/analytics';
import { DefaultSettings } from '@onlook/constants';
import {
    DomainType,
    PublishStatus,
    type DomainSettings,
    type Project,
    type PublishOptions,
    type PublishRequest,
    type PublishResponse,
    type PublishState,
} from '@onlook/models';
import { getPublishUrls, getValidSubdomain } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
import { HostingManager } from './hosting';
import type { ProjectManager } from './manager';

const DEFAULT_STATE: PublishState = {
    status: PublishStatus.UNPUBLISHED,
    message: null,
};

export class DomainsManager {
    private _hosting: HostingManager | null = null;
    state: PublishState = DEFAULT_STATE;
    private _project: Project | null = null;
    private _currentProjectId: string | null = null;
    private _isInitialized = false;

    constructor(private projectManager: ProjectManager) {
        makeAutoObservable(this);
        this.setupProjectReaction();
    }

    private setupProjectReaction() {
        // React to project changes and initialize/update accordingly
        reaction(
            () => this.projectManager.project,
            (project) => {
                this.handleProjectChange(project);
            },
            { fireImmediately: true },
        );
    }

    private handleProjectChange(project: Project | null) {
        if (!project) {
            this.clearProject();
            return;
        }

        if (this._currentProjectId !== project.id) {
            this.initializeForProject(project);
        } else {
            this._project = project;
        }
    }

    private initializeForProject(project: Project) {
        this._project = project;
        this._currentProjectId = project.id;
        this._isInitialized = true;

        if (!this.projectManager.editorEngine) {
            console.error('Editor engine not found');
            return;
        }

        // Initialize hosting manager if not already done
        if (!this._hosting) {
            this._hosting = new HostingManager(this.projectManager.editorEngine);
        }
    }

    private clearProject() {
        this._project = null;
        this._currentProjectId = null;
        this._isInitialized = false;
    }

    get project() {
        return this._project;
    }

    get currentProjectId() {
        return this._currentProjectId;
    }

    get isInitialized() {
        return this._isInitialized;
    }

    get domains() {
        return this._project?.domains;
    }

    // State management
    private updateState(partialState: Partial<PublishState>) {
        this.state = { ...this.state, ...partialState };
    }

    private updateDomain(partialState: Partial<DomainSettings>) {
        this.projectManager.updatePartialProject({
            domains: {
                base: null,
                custom: {
                    url: partialState.url || '',
                    type: DomainType.CUSTOM,
                    publishedAt: partialState.publishedAt || '',
                },
            },
        });
    }

    private removeDomain() {
        this.projectManager.updatePartialProject({
            domains: {
                base: null,
                custom: null,
            },
        });
    }

    async publish(options: PublishOptions): Promise<boolean> {
        if (!this._project || !this._isInitialized) {
            console.warn('Cannot publish: no project initialized');
            return false;
        }

        sendAnalytics('project.publish', {
            projectId: this._project.id,
            domain: this._project.domains?.custom?.url || '',
        });

        this.updateState({ status: PublishStatus.LOADING, message: 'Creating deployment...' });

        const request: PublishRequest = {
            buildScript: this._project.commands?.build || DefaultSettings.COMMANDS.build,
            urls:
                this._project.domains?.custom?.type === DomainType.CUSTOM
                    ? getPublishUrls(this._project.domains?.custom?.url || '')
                    : [this._project.domains?.custom?.url || ''],
            options,
        };

        if (!this._hosting) {
            console.error('Hosting not found');
            this.updateState({
                status: PublishStatus.ERROR,
                message: 'Hosting not initialized',
            });
            return false;
        }

        const res = await this._hosting.publish(request);

        if (!res || !res.success) {
            const error = `Failed to publish hosting environment: ${res?.message || 'client error'}`;

            this.updateState({
                status: PublishStatus.ERROR,
                message: error,
            });
            sendAnalytics('Failed to publish', {
                message: error,
            });
            return false;
        }

        this.updateState({ status: PublishStatus.PUBLISHED, message: res.message });
        this.updateDomain({
            url: this._project.domains?.custom?.url || '',
            type: DomainType.CUSTOM,
            publishedAt: new Date().toISOString(),
        });

        sendAnalytics('hosting publish success', {
            urls: request.urls,
        });
        return true;
    }

    async unpublish(): Promise<boolean> {
        if (!this._project || !this._isInitialized) {
            console.warn('Cannot unpublish: no project initialized');
            return false;
        }

        this.updateState({ status: PublishStatus.LOADING, message: 'Deleting deployment...' });
        sendAnalytics('hosting unpublish');

        const urls = getPublishUrls(this._project.domains?.custom?.url || '');

        if (!this._hosting) {
            console.error('Hosting not found');
            this.updateState({
                status: PublishStatus.ERROR,
                message: 'Hosting not initialized',
            });
            return false;
        }

        const res: PublishResponse = await this._hosting.unpublish(urls) || {
            success: false,
            message: 'Failed to unpublish',
        };

        if (!res.success) {
            const error = `Failed to unpublish hosting environment: ${res?.message || 'client error'}`;
            console.error(error);
            this.updateState({
                status: PublishStatus.ERROR,
                message: error,
            });
            sendAnalytics('Failed to unpublish', {
                message: error,
            });
            return false;
        }

        this.removeDomain();
        this.updateState({ status: PublishStatus.UNPUBLISHED, message: null });
        sendAnalytics('hosting unpublish success');
        return true;
    }

    addBaseDomainToProject(buildFlags?: string) {
        const domains = {
            base: null,
            custom: null,
            ...this._project?.domains,
        };
        if (!this._project) {
            console.error('No project found');
            return;
        }
        if (!env.NEXT_PUBLIC_HOSTING_DOMAIN) {
            console.error('NEXT_PUBLIC_HOSTING_DOMAIN is not set');
            return;
        }
        const url = `${getValidSubdomain(this._project.id)}.${env.NEXT_PUBLIC_HOSTING_DOMAIN}`;
        domains.base = {
            type: DomainType.BASE,
            url,
        };
        this.projectManager.updatePartialProject({ ...this._project, domains });

        setTimeout(() => {
            this._hosting?.publish({ buildScript: this._project?.commands?.build || DefaultSettings.COMMANDS.build, urls: [url], options: { buildFlags } });
        }, 100);
    }

    async addCustomDomainToProject(url: string) {
        const domains = {
            base: null,
            custom: null,
            ...this._project?.domains,
        };
        domains.custom = {
            type: DomainType.CUSTOM,
            url,
        };
        this.projectManager.updatePartialProject({ ...this._project, domains });
    }

    async removeCustomDomainFromProject() {
        const domains = {
            base: null,
            ...this._project?.domains,
            custom: null,
        };
        this.projectManager.updatePartialProject({ ...this._project, domains });
    }

    refresh() {
        this.updateState(DEFAULT_STATE);
    }

    dispose() {
        this.clearProject();
        this._hosting = null;
    }
}
