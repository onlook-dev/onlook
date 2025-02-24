import { MainChannels } from '@onlook/models/constants';
import type { Project } from '@onlook/models/projects';
import type { AppState, ProjectsCache } from '@onlook/models/settings';
import { makeAutoObservable } from 'mobx';
import { nanoid } from 'nanoid/non-secure';
import type { EditorEngine } from '../editor/engine';
import { invokeMainChannel, sendAnalytics } from '../utils';
import { CreateManager } from './create';
import { DomainsManager } from './domains';
import { RunManager } from './run';

export enum ProjectTabs {
    PROJECTS = 'projects',
    SETTINGS = 'settings',
    PROMPT_CREATE = 'prompt-create',
    IMPORT_PROJECT = 'import-project',
}

export class ProjectsManager {
    projectsTab: ProjectTabs = ProjectTabs.PROJECTS;
    editorEngine: EditorEngine | null = null;

    private createManager: CreateManager;
    private _project: Project | null = null;
    private _projects: Project[] = [];
    private _run: RunManager | null = null;
    private _domains: DomainsManager | null = null;

    constructor() {
        makeAutoObservable(this);
        this.createManager = new CreateManager(this);
        this.restoreProjects();
    }

    get create() {
        return this.createManager;
    }

    async restoreProjects() {
        const cachedProjects: ProjectsCache | null = await invokeMainChannel(
            MainChannels.GET_PROJECTS,
        );
        if (!cachedProjects || !cachedProjects.projects) {
            console.error('Failed to restore projects');
            return;
        }
        this._projects = cachedProjects.projects;

        const appState: AppState | null = await invokeMainChannel(MainChannels.GET_APP_STATE);
        if (!appState) {
            console.error('Failed to restore app state');
            return;
        }
        if (appState.activeProjectId) {
            this.project = this._projects.find((p) => p.id === appState.activeProjectId) || null;
        }
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
        };

        const updatedProjects = [...this._projects, newProject];
        this.projects = updatedProjects;
        return newProject;
    }

    updateProject(project: Project) {
        const updatedProjects = this._projects.map((p) => (p.id === project.id ? project : p));
        if (project.id === this.project?.id) {
            this.project = project;
        }
        this.projects = updatedProjects;
    }

    updateAppState(appState: AppState) {
        invokeMainChannel(MainChannels.REPLACE_APP_STATE, appState);
    }

    saveProjects() {
        invokeMainChannel(MainChannels.UPDATE_PROJECTS, { projects: this._projects });
    }

    deleteProject(project: Project, deleteProjectFolder: boolean = false) {
        if (this.project?.id === project.id) {
            this.project = null;
        }
        this.projects = this._projects.filter((p) => p.id !== project.id);

        if (deleteProjectFolder) {
            invokeMainChannel(MainChannels.DELETE_FOLDER, project.folderPath);
        }
        sendAnalytics('delete project', { url: project.url, id: project.id, deleteProjectFolder });
    }

    get project() {
        return this._project;
    }

    get runner(): RunManager | null {
        return this._run;
    }

    get domains(): DomainsManager | null {
        return this._domains;
    }

    set project(newProject: Project | null) {
        if (!newProject) {
            this.disposeManagers();
        } else if (newProject.id !== this._project?.id) {
            this.setOrUpdateManagers(newProject);
        }
        this._project = newProject;
        this.updateAppState({
            activeProjectId: this.project?.id ?? null,
        });
    }

    setOrUpdateManagers(project: Project) {
        if (!this.editorEngine) {
            console.error('Editor engine not found');
            return;
        }
        if (!this._run) {
            this._run = new RunManager(this.editorEngine, project);
        } else {
            this._run.updateProject(project);
        }

        if (!this._domains) {
            this._domains = new DomainsManager(this, project);
        } else {
            this._domains.updateProject(project);
        }
    }

    disposeManagers() {
        this._run?.dispose();
        this._domains?.dispose();
        this._run = null;
        this._domains = null;
    }

    get projects() {
        return this._projects;
    }

    set projects(newProjects: Project[]) {
        this._projects = newProjects;
        this.saveProjects();
    }
}
