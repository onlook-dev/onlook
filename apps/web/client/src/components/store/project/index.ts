import type { Project } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';

// Stubs for now
export class DomainsManager {
    constructor() {}
}

export class VersionsManager {
    constructor(private projectManager: ProjectManager) {}
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

    createProject(name: string, previewUrl: string): Project {
        const newProject: Project = {
            id: nanoid(),
            name,
            domains: {
                base: null,
                custom: null,
            },
            metadata: {
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                previewImg: null,
            },
            canvas: null,
            sandbox: null,
            previewUrl,
        };

        return newProject;
    }

    updatePartialProject(newProject: Partial<Project>) {
        if (!this.project) {
            console.error('Project not found');
            return;
        }
        this.project = { ...this.project, ...newProject };
    }

    dispose() {}
}
