import { api } from '@/trpc/client';
import { fromProject } from '@onlook/db';
import type { Project } from '@onlook/models';
import { makeAutoObservable } from 'mobx';
import type { EditorEngine } from '../editor/engine';

export class VersionsManager {
    constructor(private projectManager: ProjectManager) { }
}

export class ProjectManager {
    private _project: Project | null = null;
    readonly versions: VersionsManager | null = null;
    private _editorEngine: EditorEngine | null = null;

    constructor() {
        this.versions = new VersionsManager(this);
        makeAutoObservable(this);
    }

    setEditorEngine(editorEngine: EditorEngine) {
        this._editorEngine = editorEngine;
    }

    get project() {
        return this._project;
    }

    get editorEngine() {
        return this._editorEngine;
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
