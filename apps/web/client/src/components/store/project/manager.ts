import { api } from '@/trpc/client';
import { fromProject, fromProjectSettings, toProjectSettings } from '@onlook/db';
import type { Project, ProjectSettings } from '@onlook/models';
import { createDefaultProjectSettings } from '@onlook/utility';
import { makeAutoObservable, reaction } from 'mobx';

export class VersionsManager {
    constructor(private projectManager: ProjectManager) { }
}

export class ProjectManager {
    private _project: Project | null = null;
    private _projectSettings: ProjectSettings = toProjectSettings(createDefaultProjectSettings(''));
    readonly versions: VersionsManager | null = null;

    constructor() {
        this.versions = new VersionsManager(this);
        makeAutoObservable(this);

        reaction(
            () => this.project,
            () => {
                this.restoreProjectSettings();
            }
        );
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

    set projectSettings(projectSettings: ProjectSettings) {
        this._projectSettings = projectSettings;
    }

    async restoreProjectSettings() {
        if (!this.project) {
            console.error('Project not found');
            return;
        }
        const settings = await api.settings.get.query({ projectId: this.project.id });
        if (!settings) {
            console.error('Project settings not found');
            return;
        }
        this.projectSettings = settings;
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
        this.saveProjectSettingsToStorage();
    }

    async saveProjectSettingsToStorage() {
        if (!this.projectSettings) {
            console.error('Project settings not found');
            return;
        }
        if (!this.project) {
            console.error('Project not found');
            return;
        }
        return api.settings.upsert.mutate({
            projectId: this.project.id,
            settings: fromProjectSettings(this.project.id , this.projectSettings),
        });
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
