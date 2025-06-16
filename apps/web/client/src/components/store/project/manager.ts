import { api } from '@/trpc/client';
import { fromProject, fromProjectSettings } from '@onlook/db';
import type { Project, ProjectSettings } from '@onlook/models';
import { makeAutoObservable } from 'mobx';

export class VersionsManager {
    constructor(private projectManager: ProjectManager) { }
}

export class ProjectManager {
    private _project: Project | null = null;
    private _projectSettings: ProjectSettings | null = null;
    readonly versions: VersionsManager | null = null;

    constructor() {
        this.versions = new VersionsManager(this);
        makeAutoObservable(this);
    }

    get project() {
        return this._project;
    }

    set project(project: Project | null) {
        this._project = project;
    }

    get projectSettings() {
        return this._projectSettings;
    }

    set projectSettings(projectSettings: ProjectSettings | null) {
        this._projectSettings = projectSettings;
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

    updateProjectSettings(newProjectSettings: Partial<ProjectSettings>) {
        if (!this.projectSettings) {
            console.error('Project settings not found');
            return;
        }
        this.projectSettings = { ...this.projectSettings, ...newProjectSettings };
    }

    async saveProjectSettingsToStorage() {
        if (!this.projectSettings) {
            console.error('Project settings not found');
            return;
        }
        return api.settings.update.mutate(fromProjectSettings(this.projectSettings));
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
