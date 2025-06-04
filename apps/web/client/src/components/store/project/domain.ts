import { makeAutoObservable, reaction } from "mobx";
import type { ProjectManager } from "./manager";
import { PublishStatus, type Project, type PublishState, type PublishOptions, type PublishRequest, type DomainSettings, DomainType, type PublishResponse } from "@onlook/models";
import { HostingManager } from "./hosting";
import { sendAnalytics } from "@/utils/analytics";
import { DefaultSettings } from "@onlook/constants";
import { getPublishUrls } from "@onlook/utility";

const DEFAULT_STATE: PublishState = {
    status: PublishStatus.UNPUBLISHED,
    message: null,
};

export class DomainsManager {
    private _customHosting: HostingManager | null = null;
    state: PublishState = DEFAULT_STATE;
    private _project: Project | null = null;
    private _currentProjectId: string | null = null;
    private _isInitialized = false;

    constructor(
        private projectManager: ProjectManager,
    ) {
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
            { fireImmediately: true }
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
        if (!this._customHosting) {
            this._customHosting = new HostingManager(this.projectManager.editorEngine);
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

    get custom() {
        return this._customHosting;
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
            urls: getPublishUrls(this._project.domains?.custom?.url || ''),
            options,
        };

        if (!this.custom) {
            console.error('Custom hosting not found');
            this.updateState({
                status: PublishStatus.ERROR,
                message: 'Custom hosting not initialized',
            });
            return false;
        }

        const res = await this.custom.publish(request);

        if (!res || !res.success) {
            const error = `Failed to publish hosting environment: ${res?.message || 'client error'}`;
            console.error(error);
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
            publishedAt: new Date().toISOString() 
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

        if (!this.custom) {
            console.error('Custom hosting not found');
            this.updateState({
                status: PublishStatus.ERROR,
                message: 'Custom hosting not initialized',
            });
            return false;
        }

        const res: PublishResponse = await this.custom.unpublish(urls) || { 
            success: false, 
            message: 'Failed to unpublish' 
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

    refresh() {
        this.updateState(DEFAULT_STATE);
    }
    
    dispose() {
        this.clearProject();
        this._customHosting = null;
    }
}