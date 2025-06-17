import { env } from '@/env';
import { api } from '@/trpc/client';
import {
    DomainType,
    type DomainInfo,
    type Project
} from '@onlook/models';
import { getValidSubdomain } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';
import type { ProjectManager } from './manager';

export class DomainsManager {
    private _project: Project | null = null;
    domains: {
        preview: DomainInfo | null;
        custom: DomainInfo | null;
    } = {
            preview: null,
            custom: null,
        };

    constructor(private projectManager: ProjectManager) {
        makeAutoObservable(this);
        this.setupProjectReaction();
    }

    private setupProjectReaction() {
        reaction(
            () => this.projectManager.project,
            (project) => {
                this._project = project;
                if (project) {
                    this.getDomains(project.id);
                }
            },
            { fireImmediately: true },
        );
    }

    async getDomains(projectId: string) {
        try {
            const res = await api.domain.getAll.query({ projectId });
            this.domains = {
                preview: res.preview,
                custom: res.published,
            };
        } catch (error) {
            console.error('Failed to get domains', error);
        }
    }

    async createPreviewDomain(): Promise<DomainInfo> {
        if (!this._project) {
            console.error('No project found');
            throw new Error('No project found');
        }
        const domain = `${getValidSubdomain(this._project.id)}.${env.NEXT_PUBLIC_HOSTING_DOMAIN}`;
        const res = await api.domain.preview.create.mutate({
            domain,
            projectId: this._project.id,
        });
        this.domains.preview = {
            type: DomainType.PREVIEW,
            url: res.domain,
        };
        return this.domains.preview;
    }

    async addCustomDomain(url: string) {
        if (!this._project) {
            console.error('No project found');
            throw new Error('No project found');
        }
        // TODO: Implement
    }

    async verifyCustomDomain(url: string) {
        if (!this._project) {
            console.error('No project found');
            throw new Error('No project found');
        }
        // TODO: Implement
        return {
            success: true,
            message: 'Domain verified',
        };
    }

    async createDomainVerification(url: string) {
        if (!this._project) {
            console.error('No project found');
            throw new Error('No project found');
        }
        // TODO: Implement
        return {
            success: true,
            message: 'Domain verification created',
            verificationCode: '123456',
        };
    }

    async removeCustomDomain(url: string) {
        if (!this._project) {
            console.error('No project found');
            throw new Error('No project found');
        }
        // TODO: Implement
    }

    dispose() { }
}
