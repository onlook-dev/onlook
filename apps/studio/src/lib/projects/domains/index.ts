import { invokeMainChannel } from '@/lib/utils';
import { HOSTING_DOMAIN, MainChannels } from '@onlook/models/constants';
import type { GetOwnedDomainsResponse } from '@onlook/models/hosting';
import { DomainType, type Project } from '@onlook/models/projects';
import { getValidSubdomain } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
import type { ProjectsManager } from '../index';
import { HostingManager } from './hosting';
export class DomainsManager {
    private _baseHosting: HostingManager | null = null;
    private _customHosting: HostingManager | null = null;

    constructor(
        private projectsManager: ProjectsManager,
        private project: Project,
    ) {
        makeAutoObservable(this);
        this.restore();
        reaction(
            () => this.project.domains?.base,
            () => {
                if (!this.project.domains?.base) {
                    this._baseHosting = null;
                } else {
                    this._baseHosting = new HostingManager(
                        this.projectsManager,
                        this.project,
                        this.project.domains.base,
                    );
                }
            },
        );
        reaction(
            () => this.project.domains?.custom,
            () => {
                if (!this.project.domains?.custom) {
                    this._customHosting = null;
                } else {
                    this._customHosting = new HostingManager(
                        this.projectsManager,
                        this.project,
                        this.project.domains.custom,
                    );
                }
            },
        );
    }

    updateProject(project: Project) {
        this.project = project;
    }

    restore() {
        if (!this.project.domains?.base) {
            this._baseHosting = null;
        } else {
            this._baseHosting = new HostingManager(
                this.projectsManager,
                this.project,
                this.project.domains.base,
            );
        }
        if (!this.project.domains?.custom) {
            this._customHosting = null;
        } else {
            this._customHosting = new HostingManager(
                this.projectsManager,
                this.project,
                this.project.domains.custom,
            );
        }
    }

    get base() {
        return this._baseHosting;
    }

    get custom() {
        return this._customHosting;
    }

    addBaseDomainToProject() {
        const domains = {
            base: null,
            custom: null,
            ...this.project.domains,
        };
        const url = `${getValidSubdomain(this.project.id)}.${HOSTING_DOMAIN}`;
        domains.base = {
            type: DomainType.BASE,
            url,
            publishedAt: new Date().toISOString(),
        };
        this.projectsManager.updateProject({ ...this.project, domains });
    }

    async addCustomDomainToProject(url: string) {
        const domains = {
            base: null,
            custom: null,
            ...this.project.domains,
        };
        domains.custom = {
            type: DomainType.CUSTOM,
            url,
            publishedAt: new Date().toISOString(),
        };
        this.projectsManager.updateProject({ ...this.project, domains });
    }

    async removeCustomDomainFromProject() {
        const domains = {
            base: null,
            ...this.project.domains,
            custom: null,
        };
        this.projectsManager.updateProject({ ...this.project, domains });
    }

    async getOwnedDomains(): Promise<string[]> {
        const response: GetOwnedDomainsResponse = await invokeMainChannel(
            MainChannels.GET_OWNED_DOMAINS,
        );
        if (!response.success) {
            console.error(response.message ?? 'Failed to get owned domains');
            return [];
        }
        return response.domains ?? [];
    }

    dispose() {
        this._baseHosting?.dispose();
        this._customHosting?.dispose();
    }
}
