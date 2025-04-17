import type { Project } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid';

export class ProjectManager {
    private _project: Project | null = null;
    // private _domains: DomainsManager | null = null;
    // private _versions: VersionsManager | null = null;
    constructor() {
        makeAutoObservable(this);
    }

    get project() {
        return this._project;
    }

    get versions(): VersionsManager | null {
        return this._versions;
    }

    set project(project: Project | null) {
        this._project = project;
    }

    createProject(
        name: string,
        url: string,
        folderPath: string,
        commands: {
            install: string;
            run: string;
            build: string;
        },
    ): Project {
        const newProject: Project = {
            id: nanoid(),
            name,
            url,
            folderPath,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            commands,
            previewImg: null,
            settings: null,
            domains: {
                base: null,
                custom: null,
            },
            metadata: null,
            env: {},
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

    dispose() { }
}
