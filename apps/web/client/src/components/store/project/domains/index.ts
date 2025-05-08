import { HOSTING_DOMAIN } from '@onlook/constants';
import { DomainType, type Project } from '@onlook/models';
import { getValidSubdomain } from '@onlook/utility';
import { makeAutoObservable } from 'mobx';
import type { ProjectManager } from '../manager';
import { HostingManager } from './hosting';

export class DomainsManager {
    private _baseHosting: HostingManager | null = null;
    private _customHosting: HostingManager | null = null;

    constructor(
        private projectManager: ProjectManager,
        private project: Project,
    ) {
        this.setupHostingManagers();
        makeAutoObservable(this);
    }

    updateProject(project: Project) {
        this.project = project;
        this.setupHostingManagers();
    }

    setupHostingManagers() {
        if (!this.project.domains?.base) {
            this._baseHosting = null;
        } else {
            this._baseHosting = new HostingManager(
                this.projectManager,
                this.project,
                this.project.domains.base,
            );
        }
        if (!this.project.domains?.custom) {
            this._customHosting = null;
        } else {
            this._customHosting = new HostingManager(
                this.projectManager,
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

    addBaseDomainToProject(buildFlags?: string) {
        const domains = {
            base: this.project.domains?.base ?? null,
            custom: this.project.domains?.custom ?? null,
        };
        const url = `${getValidSubdomain(this.project.id)}.${HOSTING_DOMAIN}`;
        domains.base = {
            type: DomainType.BASE,
            url,
        };
        this.projectManager.updateProject({ ...this.project, domains });

        setTimeout(() => {
            this.base?.publish({ buildFlags, envVars: this.project.env });
        }, 100);
    }

    async addCustomDomainToProject(url: string) {
        const domains = {
            base: this.project.domains?.base ?? null,
            custom: this.project.domains?.custom ?? null,
        };
        domains.custom = {
            type: DomainType.CUSTOM,
            url,
        };
        this.projectManager.updateProject({ ...this.project, domains });
    }

    async removeCustomDomainFromProject() {
        const domains = {
            base: this.project.domains?.base ?? null,
            custom: null,
        };
        this.projectManager.updateProject({ ...this.project, domains });
    }

    async getOwnedDomains(): Promise<string[]> {
        return [];
        // const response: GetOwnedDomainsResponse = await invokeMainChannel(
        //     MainChannels.GET_OWNED_DOMAINS,
        // );
        // if (!response.success) {
        //     console.error(response.message ?? 'Failed to get owned domains');
        //     return [];
        // }
        // return response.domains ?? [];
    }

    dispose() {
        this._baseHosting?.dispose();
        this._customHosting?.dispose();
    }
}
