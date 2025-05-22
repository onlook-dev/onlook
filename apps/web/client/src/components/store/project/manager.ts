import { extractMetadata } from './metadata';
import type { Project } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { normalizePath } from '../editor/sandbox/helpers';
import type { HostingManager } from './domains/hosting';
// Stubs for now
export class DomainsManager {
    private _baseHosting: HostingManager | null = null;
    private _customHosting: HostingManager | null = null;

    constructor() {}

    get base() {
        return this._baseHosting;
    }

    get custom() {
        return this._customHosting;
    }
}

export class VersionsManager {
    constructor(private projectManager: ProjectManager) {}

    get commits() {
        return [];
    }
}

export class ProjectManager {
    private _project: Project | null = null;
    readonly domains: DomainsManager | null = null;
    readonly versions: VersionsManager | null = null;

    constructor() {
        this.domains = new DomainsManager();
        this.versions = new VersionsManager(this);
        makeAutoObservable(this);
    }

    get project() {
        return this._project;
    }

    set project(project: Project | null) {
        this._project = project;
    }

    updatePartialProject(newProject: Partial<Project>) {
        if (!this.project) {
            console.error('Project not found');
            return;
        }
        this.project = { ...this.project, ...newProject };
    }

    updateProject(newProject: Project) {
        this.project = newProject;
    }

    async scanProjectMetadata() {
        try {
            const project = this.project;
            if (!project) {
                return;
            }
            const layoutPath = normalizePath('app/layout.tsx');
            const extractedMetadata = await extractMetadata(layoutPath);

            if (extractedMetadata) {
                this.updatePartialProject({ siteMetadata: extractedMetadata });
            }
        } catch (error) {
            console.error('Error scanning project metadata:', error);
        }
    }

    dispose() {}
}
