import { api } from '@/trpc/client';
import { fromProject } from '@onlook/db';
import type { Project } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import { DomainsManager } from './domain';
import { HostingManager } from './hosting';
import { DefaultSettings } from '@onlook/constants';
import type { EditorEngine } from '../editor/engine';

export class VersionsManager {
    constructor(private projectManager: ProjectManager) { }
}

export class ProjectManager {
    private _project: Project | null = null;
    private _domains: DomainsManager | null = null;
    readonly versions: VersionsManager | null = null;
    private _editorEngine: EditorEngine | null = null;

    constructor() {
        this.versions = new VersionsManager(this);
        makeAutoObservable(this);
    }

    setEditorEngine(editorEngine: EditorEngine) {
        this._editorEngine = editorEngine;
        this.updateDomainsManager();
    }

    private updateDomainsManager() {
        if (this._project && this._editorEngine) {
            this._domains = new DomainsManager(this, this._project, this._editorEngine);
        } else {
            this._domains = null;
        }
    }

    get project() {
        return this._project;
    }

    get domains() {
        return this._domains;
    }

    set project(project: Project | null) {
        this._project = project;
        this.updateDomainsManager();
    }

    public publish() {
        console.log('publish', this.project);
        if (!this.project) {
            console.error('Project not found');
            return;
        }
        console.log('publish', this.domains);
        this.domains?.publish({
            buildFlags: DefaultSettings.EDITOR_SETTINGS.buildFlags
            // envVars: {},
        });
    }

    updatePartialProject(newProject: Partial<Project>) {
        if (!this.project) {
            console.error('Project not found');
            return;
        }
        this.project = { ...this.project, ...newProject };
        this.saveProjectToStorage();
    }

    updateProject(newProject: Project) {
        this.project = newProject;
        this.saveProjectToStorage();
    }

    async saveProjectToStorage() {
        if (!this.project) {
            console.error('Project not found');
            return;
        }

        return api.project.update.mutate(fromProject(this.project));
    }

    clear() {
        this.project = null
    }
}
