import type { Project } from '@onlook/models';
import { makeAutoObservable } from 'mobx';

// Stubs for now
export class DomainsManager {
    constructor() { }
}

export class VersionsManager {
    constructor(private projectManager: ProjectManager) { }
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

    clear() {
        this.project = null
    }
}
